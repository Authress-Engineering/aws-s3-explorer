// Utility to convert bytes to readable text e.g. "2 KB" or "5 MB"
export function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const ii = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${Math.round(bytes / (1024 ** ii), 2)} ${sizes[ii]}`;
}

// Escape strings of HTML
export function htmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
}

// Convert cars/vw/golf.png to golf.png
export function fullpath2filename(path, escape = false) {
  const rc = path.replace(/^.*[\\/]/, '');
  return escape ? htmlEscape(rc) : rc;
}

// Convert cars/vw/golf.png to cars/vw/
export function fullpath2pathname(path, escape = false) {
  const index = path.lastIndexOf('/');
  const rc = (index === -1) ? '/' : path.substring(0, index + 1);
  return escape ? htmlEscape(rc) : rc;
}

// Convert cars/vw/ to vw/
export function prefix2folder(prefix, escape = false) {
  const parts = prefix.split('/');
  const rc = `${parts[parts.length - 2]}/`;
  return escape ? htmlEscape(rc) : rc;
}

// Convert cars/vw/sedans/ to cars/vw/
export function prefix2parentfolder(prefix, escape = false) {
  const parts = prefix.split('/');
  parts.splice(parts.length - 2, 1);
  const rc = parts.join('/');
  return escape ? htmlEscape(rc) : rc;
}

// Convert cars/vw/golf.png to  cars/.../golf.png
const pathLimit = 80; // Max allowed path length
const pathHellip = String.fromCharCode(8230); // '&hellip;' char
export function path2short(path, escape = false) {
  if (path.length < pathLimit) return escape ? htmlEscape(path) : path;

  const soft = `${prefix2parentfolder(fullpath2pathname(path)) + pathHellip}/${fullpath2filename(path)}`;
  if (soft.length < pathLimit && soft.length > 2) return escape ? htmlEscape(soft) : soft;

  const hard = `${path.substring(0, path.indexOf('/') + 1) + pathHellip}/${fullpath2filename(path)}`;
  const rc = hard.length < pathLimit ? hard : path.substring(0, pathLimit) + pathHellip;
  return escape ? htmlEscape(rc) : rc;
}

// Virtual-hosted-style URL, ex: https://mybucket1.s3.amazonaws.com/index.html
export function object2hrefvirt(bucket, key, escape = false) {
  const enckey = key.split('/').map(x => encodeURIComponent(x)).join('/');
  const rc = `${document.location.protocol}//${bucket}.s3.amazonaws.com/${enckey}`;
  return escape ? htmlEscape(rc) : rc;
}

// Path-style URLs, ex: https://s3.amazonaws.com/mybucket1/index.html
// eslint-disable-next-line no-unused-vars
export function object2hrefpath(bucket, key, escape = false) {
  const enckey = key.split('/').map(x => encodeURIComponent(x)).join('/');
  const rc = `${document.location.protocol}//s3.amazonaws.com/${bucket}/${enckey}`;
  return escape ? htmlEscape(rc) : rc;
}

export function isFolder(path) {
  return path.endsWith('/');
}

export function stripLeadTrailSlash(s) {
  return s.replace(/^\/+/g, '').replace(/\/+$/g, '');
}

export function formatByteSize(size) {
  if (!size) { return ''; }

  const sizeMap = {
    0: 'B',
    1: 'KB',
    2: 'MB',
    3: 'GB',
    4: 'TB',
    5: 'PB'
  };

  let computedSize = size;
  for (let modifier = 0; modifier < 5; modifier++) {
    if (computedSize < 2048) {
      return `${computedSize} ${sizeMap[modifier]}`;
    }
    computedSize = Math.floor(computedSize / 102.4) / 10;
  }

  return 'Too Large';
}
