function is_daemon_installed --description "Checks whether the daemon is installed"
  set active (launchctl list | grep $daemon_name)
  if [ (count $active) -eq 0 ]
    echo "$script_name: launch daemon is not installed"
    return 1
  else
    echo "$script_name: launch daemon is installed"
  end
end

function install_daemon --description "Ensures that the launch daemon is installed"
  set installed (launchctl list | grep "$daemon_name" | wc -l | bc)
  if not test -e $daemon_plist_path
    cp (dirname (status --current-filename))"/$daemon_plist" "$daemon_plist_path"
    launchctl load "$daemon_plist_path"
    echo "$script_name: installed launch daemon: "(set_color yellow)"$daemon_plist"(set_color normal)
  else
    launchctl unload "$daemon_plist_path"
    cp (dirname (status --current-filename))"/$daemon_plist" "$daemon_plist_path"
    launchctl load "$daemon_plist_path"
    echo "$script_name: reinstalled launch daemon: "(set_color yellow)"$daemon_plist"(set_color normal)
  end
end

function uninstall_daemon --description "Ensures that the launch daemon is uninstalled"
  set installed (launchctl list | grep "$daemon_name" | wc -l | bc)
  if not test -e $daemon_plist_path
    echo "$script_name: launch daemon is not installed"
    return 1
  else
    launchctl unload "$daemon_plist_path"
    rm -f "$daemon_plist_path"
    echo "$script_name: uninstalled launch daemon: "(set_color yellow)"$daemon_plist"(set_color normal)
  end
end

if [ -z "$daemon_name" ]
  echo 'launchagent.sh: error: cannot be run directly'
  exit
end

if [ "$argv[1]" = "install" ]
  install_daemon
else if [ "$argv[1]" = "uninstall" ]
  uninstall_daemon
else if [ "$argv[1]" = "status" ]
  is_daemon_installed
else
  echo "usage: $script_name {install, uninstall, status}"
  exit 1
end
