/* eslint-disable */
const s3ExplorerColumns = {
  check: 0, object: 1, folder: 2, date: 3, timestamp: 4, storageclass: 5, size: 6,
};

//
// ViewController: code associated with the main S3 Explorer table that shows
// the contents of the current bucket/folder and allows the user to downloads
// files, delete files, and do various other S3 functions.
//
// eslint-disable-next-line no-shadow
function ViewController($scope, SharedService) {
  DEBUG.log('ViewController init');
  window.viewScope = $scope; // for debugging
  $scope.view = {
    bucket: null, prefix: null, settings: null, objectCount: 0, keys_selected: [],
  };
  $scope.stop = false;

  // Delegated event handler for S3 object/folder clicks. This is delegated
  // because the object/folder rows are added dynamically and we do not want
  // to have to assign click handlers to each and every row.
  s3objectsTable.on('click', 'a', (e) => {
    const { currentTarget: target } = e;
    e.preventDefault();
    DEBUG.log('target href:', target.href);
    DEBUG.log('target dataset:', JSON.stringify(target.dataset));

    if (target.dataset.s3 === 'folder') {
      // User has clicked on a folder so navigate into that folder
      store.changeViewPrefix(target.dataset.s3key);
    } else if ($scope.view.settings.auth === 'anon') {
      // Unauthenticated user has clicked on an object so download it
      // in new window/tab
      window.open(target.href, '_blank');
    } else {
      // Authenticated user has clicked on an object so create pre-signed
      // URL and download it in new window/tab
      const s3 = new AWS.S3();
      const params = {
        Bucket: $scope.view.settings.bucket, Key: target.dataset.s3key, Expires: 15,
      };
      DEBUG.log('params:', params);
      s3.getSignedUrl('getObject', params, (err, url) => {
        if (err) {
          DEBUG.log('err:', err);
          SharedService.showError(params, err);
        } else {
          DEBUG.log('url:', url);
          window.open(url, '_blank');
        }
      });
    }
    return false;
  });

  // Delegated event handler for breadcrumb clicks.
  breadcrumb.on('click', 'a', (e) => {
    DEBUG.log('breadcrumb li click');
    e.preventDefault();
    const { currentTarget: target } = e;
    DEBUG.log('target dataset:', JSON.stringify(target.dataset));
    store.changeViewPrefix(target.dataset.prefix);
    return false;
  });

  $scope.$on('broadcastChangeSettings', (e, args) => {
    DEBUG.log('ViewController', 'broadcast change settings:', args.settings);
    $scope.view.objectCount = 0;
    $scope.view.settings = args.settings;
    $scope.refresh();
  });

  $scope.$on('broadcastChangePrefix', (e, args) => {
    DEBUG.log('ViewController', 'broadcast change prefix args:', args);
    $scope.$apply(() => {
      // Create breadcrumbs from current path (S3 bucket plus folder hierarchy)
      $scope.folder2breadcrumbs($scope.view.settings.bucket, args.viewprefix || args.prefix);

      if (args.viewprefix !== undefined && args.viewprefix !== null) {
        // In bucket-level view we already have the data so we just need to
        // filter it on prefix.
        $.fn.dataTableExt.afnFiltering.length = 0;

        $.fn.dataTableExt.afnFiltering.push(
          // Filter function returns true to include item in view
          (_o, d, _i) => d[1] !== args.viewprefix && d[1].startsWith(args.viewprefix),
        );

        // Re-draw the table
        s3objectsTable.DataTable().draw();
      } else {
        // In folder-level view, we actually need to query the data for the
        // the newly-selected folder.
        $.fn.dataTableExt.afnFiltering.length = 0;
        $scope.view.settings.prefix = args.prefix;
        $scope.refresh();
      }
    });
  });

  $scope.$on('broadcastViewRefresh', () => {
    DEBUG.log('ViewController', 'broadcast view refresh');
    $scope.$apply(() => {
      $scope.refresh();
    });
  });

  $scope.renderObject = (data, _type, full) => {
    // DEBUG.log('renderObject:', JSON.stringify(full));
    const hrefv = object2hrefvirt($scope.view.settings.bucket, data);

    function buildAnchor(s3key, href, text, download) {
      const a = $('<a>');
      a.attr({ 'data-s3key': s3key });
      a.attr({ href });
      if (download) {
        a.attr({ 'data-s3': 'object' });
        a.attr({ download });
      } else {
        a.attr({ 'data-s3': 'folder' });
      }
      a.text(text);
      return a.prop('outerHTML');
    }

    function render(d, href, text, download) {
      if (download) {
        return buildAnchor(d, href, text, download);
      }

      return buildAnchor(d, href, text);
    }

    if (full.CommonPrefix) {
      if ($scope.view.settings.prefix) {
        return render(data, hrefv, prefix2folder(data));
      }

      return render(data, hrefv, data);
    }

    return render(data, hrefv, fullpath2filename(data), fullpath2filename(data));
  };

  $scope.renderFolder = (data, _type, full) => (full.CommonPrefix ? '' : fullpath2pathname(data, true));

  $scope.progresscb = (objects, folders) => {
    DEBUG.log('ViewController', 'Progress cb objects:', objects);
    DEBUG.log('ViewController', 'Progress cb folders:', folders);
    $scope.$apply(() => {
      $scope.view.objectCount += objects + folders;
    });
  };

  $scope.refresh = () => {
    DEBUG.log('refresh');
    if ($scope.running()) {
      DEBUG.log('running, stop');
      $scope.listobjectsstop();
    } else {
      DEBUG.log('refresh', $scope.view.settings);
      $scope.view.objectCount = 0;
      $scope.folder2breadcrumbs(
        $scope.view.settings.bucket,
        store.getViewPrefix(),
      );
      $scope.listobjects(
        store.currentBucket,
        store.prefix,
        store.delimiter,
      );
    }
  };

  $scope.upload = () => {
    DEBUG.log('Add files');
    $('#addedFiles').trigger('click');
  };

  $scope.running = () => bucketLoader.hasClass('fa-spin');

  $scope.folder2breadcrumbs = (bucket, prefix) => {
    DEBUG.log('Breadcrumbs bucket:', bucket);
    DEBUG.log('Breadcrumbs prefix:', prefix);

    // Empty the current breadcrumb list
    $('#breadcrumb li').remove();

    // This array will contain the needed prefixes for each folder level.
    const prefixes = [''];
    let buildprefix = '';

    if (prefix) {
      prefixes.push(...prefix.replace(/\/$/g, '').split('/'));
    }

    // Add bucket followed by prefix segments to make breadcrumbs
    for (let ii = 0; ii < prefixes.length; ii++) {
      let li;

      // Bucket
      if (ii === 0) {
        const a1 = $('<a>').attr('href', '#').text(bucket);
        li = $('<li>').append(a1);
      // Followed by n - 1 intermediate folders
      } else if (ii < prefixes.length - 1) {
        const a2 = $('<a>').attr('href', '#').text(prefixes[ii]);
        li = $('<li>').append(a2);
      // Followed by current folder
      } else {
        li = $('<li>').text(prefixes[ii]);
      }

      // Accumulate prefix
      if (ii) {
        buildprefix = `${buildprefix}${prefixes[ii]}/`;
      }

      // Save prefix & bucket data for later click handler
      li.children('a').attr('data-prefix', buildprefix).attr('data-bucket', bucket);

      // Add to breadcrumbs
      breadcrumb.append(li);
    }

    // Make last breadcrumb active
    $('#breadcrumb li:last').addClass('active');
  };

  $scope.listobjectsstop = (stop) => {
    DEBUG.log('ViewController', 'listobjectsstop:', stop || true);
    $scope.stop = stop || true;
  };

  // This is the listObjects callback
  $scope.listobjectscb = (err, data) => {
    DEBUG.log('Enter listobjectscb');
    if (err) {
      DEBUG.log('Error:', JSON.stringify(err));
      DEBUG.log('Error:', err.stack);
      bucketLoader.removeClass('fa-spin');
      const params = { bucket: $scope.view.bucket, prefix: $scope.view.prefix };
      SharedService.showError(params, err);
    } else {
      let marker;

      // Store marker before filtering data. Note that Marker is the
      // previous request marker, not the marker to use on the next call
      // to listObject. For the one to use on the next invocation you
      // need to use NextMarker or retrieve the key of the last item.
      if (data.IsTruncated) {
        if (data.NextMarker) {
          marker = data.NextMarker;
        } else if (data.Contents.length > 0) {
          marker = data.Contents[data.Contents.length - 1].Key;
        }
      }

      const count = { objects: 0, folders: 0 };

      // NOTE: folders are returned in CommonPrefixes if delimiter is
      // supplied on the listObjects call and in Contents if delimiter
      // is not supplied on the listObjects call, so we may need to
      // source our DataTable folders from Contents or CommonPrefixes.
      // DEBUG.log("Contents", data.Contents);
      $.each(data.Contents, (index, value) => {
        if (value.Key === data.Prefix) {
          // ignore this folder
        } else if (isFolder(value.Key)) {
          s3objectsTable.DataTable().row.add({
            CommonPrefix: true, Key: value.Key, StorageClass: null,
          });
          count.folders++;
        } else {
          s3objectsTable.DataTable().row.add(value);
          count.objects++;
        }
      });

      // Add folders to the datatable. Note that folder entries in the
      // DataTable will have different content to object entries and the
      // folders can be identified by CommonPrefix=true.
      // DEBUG.log("CommonPrefixes:", data.CommonPrefixes);
      $.each(data.CommonPrefixes, (index, value) => {
        s3objectsTable.DataTable().rows.add([
          { CommonPrefix: true, Key: value.Prefix, StorageClass: null },
        ]);
        count.objects++;
      });

      // Re-draw the table
      s3objectsTable.DataTable().draw();

      // Make progress callback to report objects read so far
      $scope.progresscb(count.objects, count.folders);

      const params = {
        Bucket: data.Name, Prefix: data.Prefix, Delimiter: data.Delimiter, Marker: marker,
      };

      // DEBUG.log("AWS.config:", JSON.stringify(AWS.config));

      if ($scope.stop) {
        DEBUG.log('Bucket', data.Name, 'stopped');
        bucketLoader.removeClass('fa-spin');
      } else if (data.IsTruncated) {
        DEBUG.log('Bucket', data.Name, 'truncated');
        const s3 = new AWS.S3(AWS.config);
        if (AWS.config.credentials && AWS.config.credentials.accessKeyId) {
          DEBUG.log('Make S3 authenticated call to listObjects');
          s3.listObjects(params, $scope.listobjectscb);
        } else {
          DEBUG.log('Make S3 unauthenticated call to listObjects');
          s3.makeUnauthenticatedRequest('listObjects', params, $scope.listobjectscb);
        }
      } else {
        DEBUG.log('Bucket', data.Name, 'listing complete');
        bucketLoader.removeClass('fa-spin');
      }
    }
  };

  // Start the spinner, clear the table, make an S3 listObjects request
  $scope.listobjects = (Bucket, Prefix, Delimiter, Marker) => {
    DEBUG.log('Enter listobjects');

    // If this is the initial listObjects
    if (!Marker) {
      // Checked on each event cycle to stop list prematurely
      $scope.stop = false;

      // Start spinner and clear table
      $scope.view.keys_selected = [];
      bucketLoader.addClass('fa-spin');
      s3objectsTable.DataTable().clear();
      s3objectsTable.DataTable().column(s3ExplorerColumns.folder).visible(!Delimiter);
    }

    const s3 = new AWS.S3(AWS.config);
    const params = {
      Bucket, Prefix, Delimiter, Marker,
    };

    // DEBUG.log("AWS.config:", JSON.stringify(AWS.config));

    // Now make S3 listObjects call(s)
    if (AWS.config.credentials && AWS.config.credentials.accessKeyId) {
      DEBUG.log('Make S3 authenticated call to listObjects, params:', params);
      s3.listObjects(params, $scope.listobjectscb);
    } else {
      DEBUG.log('Make S3 unauthenticated call to listObjects, params:', params);
      s3.makeUnauthenticatedRequest('listObjects', params, $scope.listobjectscb);
    }
  };

  // Individual render functions so that we can control how column data appears
  this.renderSelect = (data, type, _full) => {
    if (type === 'display') {
      return '<span class="text-center"><input type="checkbox"></span>';
    }

    return '';
  };

  this.renderObject = (data, type, full) => {
    if (type === 'display') {
      return $scope.renderObject(data, type, full);
    }

    return data;
  };

  this.renderFolder = (data, type, full) => $scope.renderFolder(data, type, full);

  this.renderLastModified = (data, _type, _full) => {
    if (data) {
      return moment(data).fromNow();
    }

    return '';
  };

  this.renderTimestamp = (data, _type, _full) => {
    if (data) {
      return moment(data).local().format('YYYY-MM-DD HH:mm:ss');
    }

    return '';
  };

  this.renderStorageClass = (data, _type, _full) => {
    if (data) {
      return store.s3StorageClasses[data];
    }

    return '';
  };

  // Object sizes are displayed in nicer format e.g. 1.2 MB but are otherwise
  // handled as simple number of bytes e.g. for sorting purposes
  this.dataSize = (source, type, _val) => {
    if (source.Size) {
      return (type === 'display') ? bytesToSize(source.Size) : source.Size;
    }

    return '';
  };

  // Initial DataTable settings (must only do this one time)
  s3objectsTable.DataTable({
    iDisplayLength: 25,
    order: [[2, 'asc'], [1, 'asc']],
    aoColumnDefs: [
      {
        aTargets: [0], mData: null, mRender: this.renderSelect, sClass: 'text-center', sWidth: '20px', bSortable: false,
      },
      {
        aTargets: [1], mData: 'Key', mRender: this.renderObject, sType: 'key',
      },
      {
        aTargets: [2], mData: 'Key', mRender: this.renderFolder,
      },
      {
        aTargets: [3], mData: 'LastModified', mRender: this.renderLastModified,
      },
      {
        aTargets: [4], mData: 'LastModified', mRender: this.renderTimestamp,
      },
      {
        aTargets: [5], mData: 'StorageClass', mRender: this.renderStorageClass,
      },
      {
        aTargets: [6], mData: this.dataSize,
      },
    ],
  });

  // Custom ascending sort for Key column so folders appear before objects
  $.fn.dataTableExt.oSort['key-asc'] = (a, b) => {
    const x = (isFolder(a) ? `0-${a}` : `1-${a}`).toLowerCase();
    const y = (isFolder(b) ? `0-${b}` : `1-${b}`).toLowerCase();
    if (x < y) return -1;
    if (x > y) return 1;
    return 0;
  };

  // Custom descending sort for Key column so folders appear before objects
  $.fn.dataTableExt.oSort['key-desc'] = (a, b) => {
    const x = (isFolder(a) ? `1-${a}` : `0-${a}`).toLowerCase();
    const y = (isFolder(b) ? `1-${b}` : `0-${b}`).toLowerCase();
    if (x < y) return 1;
    if (x > y) return -1;
    return 0;
  };

  // Handle click on selection checkbox
  $('#s3objects-table tbody').on('click', 'input[type="checkbox"]', (e1) => {
    const checkbox = e1.currentTarget;
    const $row = $(checkbox).closest('tr');
    const data = s3objectsTable.DataTable().row($row).data();
    let index = -1;

    // Prevent click event from propagating to parent
    e1.stopPropagation();

    // Find matching key in currently checked rows
    index = $scope.view.keys_selected.findIndex(e2 => e2.Key === data.Key);

    // Remove or add checked row as appropriate
    if (checkbox.checked && index === -1) {
      $scope.view.keys_selected.push(data);
    } else if (!checkbox.checked && index !== -1) {
      $scope.view.keys_selected.splice(index, 1);
    }

    $scope.$apply(() => {
      // Doing this to force Angular to update models
      DEBUG.log('Selected rows:', $scope.view.keys_selected);
    });

    if (checkbox.checked) {
      $row.addClass('selected');
    } else {
      $row.removeClass('selected');
    }
  });

  // Handle click on table cells
  $('#s3objects-table tbody').on('click', 'td', (e) => {
    $(e.currentTarget).parent().find('input[type="checkbox"]').trigger('click');
  });
}