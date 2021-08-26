/* globals moment */

import DEBUG from './logger';
import store from './store';
import { prefix2folder, fullpath2filename, path2short, isFolder, prefix2parentfolder, fullpath2pathname, bytesToSize } from './converts';

export function trashObjects() {
  DEBUG.log('Trash:', store.keys_selected);
  if (store.keys_selected.length > 0) {
    for (let ii = 0; ii < store.keys_selected.length; ii++) {
      const obj = store.keys_selected[ii];
      DEBUG.log('Object to be deleted:', obj);

      const object = path2short(isFolder(obj.Key)
        ? prefix2folder(obj.Key)
        : fullpath2filename(obj.Key));

      const folder = path2short(isFolder(obj.Key)
        ? prefix2parentfolder(obj.Key)
        : fullpath2pathname(obj.Key));

      const lastmodified = isFolder(obj.Key)
        ? ''
        : moment(obj.LastModified).fromNow();

      const timestamp = obj.LastModified
        ? moment(obj.LastModified).local().format('YYYY-MM-DD HH:mm:ss')
        : '';

      const objectclass = isFolder(obj.Key)
        ? ''
        : store.s3StorageClasses[obj.StorageClass];

      const size = isFolder(obj.Key)
        ? ''
        : bytesToSize(obj.Size);

      // Open modal and trash these things
      const trashObject = {
        object,
        folder,
        lastmodified,
        timestamp,
        objectclass,
        size,
      };

      console.error('**** open modal to trash these', trashObject);
    }
  }
}
