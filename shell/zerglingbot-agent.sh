#!/usr/bin/env fish

set -x script_name "zerglingbot-agent.sh"

set -x daemon_name com.dadatools.zerglingbot
set -x daemon_plist $daemon_name.plist
set -x daemon_plist_path ~/"Library/LaunchAgents/$daemon_plist"

source (dirname (status --current-filename))"/launchagent.sh" $argv
