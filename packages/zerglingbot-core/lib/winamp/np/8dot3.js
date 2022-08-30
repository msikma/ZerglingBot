// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const fs = require('fs').promises

/**
 * An example of an 8dot3 filename: 'M:\\Music\\GAME~46A\\SGDQ~745\\0087~954.OPU'
 * 
 * See the following URL for more information:
 * <https://web.archive.org/web/20131206010029/http://support.microsoft.com/kb/142982>
 */

/** These characters are not permitted in short filenames. */
const charsUnderscore = ['.', '"', '/', '\\', '[', ']', ':', ';', '=', ',']
const charsZero = [' ']

function escapeRegex(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function to8Dot3Fn(filename, toUnderscore = charsUnderscore, toZero = charsZero) {
  let f = path.parse(filename)
  let fn = f.name
  let ext = f.ext.slice(1).toLowerCase()
  fn = fn.replace(/[^\x00-\x7F]/g, '')
  fn = fn.toUpperCase()
  fn = fn.replace(new RegExp(`${toZero.map(c => escapeRegex(c)).join('|')}`, 'g'), '')
  fn = fn.replace(new RegExp(`${toUnderscore.map(c => escapeRegex(c)).join('|')}`, 'g'), '_')
  return [fn, ext, `${fn}.${ext}`]
}

function get8Dot3Hint(filename, numberIsHex = false) {
  const split = filename.split('~')
  
  // There must be exactly one tilde.
  // If there's less or more, this is not an 8dot3 filename.
  if (split.length !== 2 || filename.length > 12) {
    return [filename, null, false]
  }
  
  const [hint, numeric] = split
  
  // The numeric part of the filename may contain hexadecimal characters.
  // Unknown when this is the case, but it seems to happen on network drives.
  if (numberIsHex || numeric.match(/[a-f]/i)) {
    return [hint, parseInt(numeric, 16), true]
  }
  
  return [hint, parseInt(numeric, 10), true]
}

function splitIntoBasedir(segments, rdir, cwd) {
  if (segments[0].match(/^[a-z]:$/i)) {
    return [rdir, segments.slice(1)]
  }
  return [cwd, segments]
}

function getFileNumber(filename, hasHash, n) {
  // note: hasHash is not implemented.
  return n
}

function getExtension(file) {
  const f = path.parse(file)
  return f.ext.slice(1).toLowerCase()
}

async function walkPath(base, segments, hasHash = false) {
  const realSegments = []
  
  while (true) {
    const curr = path.join(base, realSegments.join(path.sep))
    const segment = segments.shift()
    if (segment === undefined) {
      break
    }
    const [hint, number, is8Dot3] = get8Dot3Hint(segment)
    
    if (!is8Dot3) {
      realSegments.push(segment)
      continue
    }
    
    const files = (await fs.readdir(curr))
    const ext = getExtension(segment)
    const hintMatches = files
      .map(f => [f, to8Dot3Fn(f)])
      .filter(f => f[0].length > 8 && f[1][0].match(new RegExp(`^${escapeRegex(hint)}`, 'i')))
      .filter(f => ext === f[1][1])
      .map((f, n) => [f[0], f[1][2], getFileNumber(f, hasHash, n + 1)])
    const numericMatches = hintMatches.filter(([f, f8, n]) => n === number)
    if (hintMatches.length === 1) {
      realSegments.push(hintMatches[0][0])
      continue
    }
    else if (numericMatches.length === 1) {
      realSegments.push(numericMatches[0][0])
      continue
    }
    else if (hintMatches.length > 1) {
      try {
        return await Promise.any(hintMatches.map(([f, n]) => walkPath(path.join(curr, f), [...segments], hasHash)))
      }
      catch (err) {
        return null
      }
    }
    else {
      // This seems to be a dead end.
      throw new Error(`No candidates: ${base} - ${segment} - [${segments.join(',')}]`)
    }
  }
  
  return path.join(base, ...realSegments)
}

async function find8Dot3Path(wp, rdir = '/', cwd = process.cwd(), hasHash = false) {
  const split = wp.split(path.win32.sep)
  const [base, segments] = splitIntoBasedir(split, rdir, cwd)
  return walkPath(base, segments, hasHash)
}

module.exports = {
  find8Dot3Path
}
