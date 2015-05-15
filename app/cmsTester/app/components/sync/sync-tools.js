/**
 * Created by Karen on 5/11/2015.
 */
'use strict';

var sync = angular.module('as.sync-tools', ['ngResource'])
//<editor-fold desc="$store">
sync.factory('$store', function ($q) {
    var fileSystem = undefined
    var deferred = $q.defer()
    function onInitFs(fs) {
        fileSystem = fs
        console.log('Opened file system: ' + fs.name);
        deferred.resolve()

    }
    function errorHandler(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };

        console.log('Error: ' + msg);
        deferred.reject()
    }

    if(window.requestFileSystem == undefined)
    {
        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(PERSISTENT, 1024*1024*500, onInitFs, errorHandler);
        navigator.webkitTemporaryStorage.requestQuota  (1024*1024*500,
            function(grantedBytes) {


            }, function(e) { console.log('Error', e); }
        );
    }

    return {
        ready: deferred.promise,
        save: function(resourceName,data,type)
        {
            var deferred = $q.defer();
            if(fileSystem==undefined)
            {
                deferred.reject("No file system found!")
            }
            else
            {
                fileSystem.root.getFile(resourceName, {create: true}, function(fileEntry) {

                    // Create a FileWriter object for our FileEntry (log.txt).
                    fileEntry.createWriter(function(fileWriter) {

                        fileWriter.onwriteend = function(e) {
                            deferred.resolve()
                        };

                        fileWriter.onerror = function(e) {
                            deferred.reject(e.toString());
                        };

                        // Create a new Blob and write it to log.txt.
                        var blob = new Blob([data], {type: type});

                        fileWriter.write(blob);

                    }, errorHandler);

                }, errorHandler);

            }
            return deferred.promise;
        },
        load: function(resource)
        {
            var deferred = $q.defer();
            if(fileSystem==undefined)
            {
                deferred.reject("No file system found!")
            }
            else
            {
                fileSystem.root.getFile(resource, {}, function(fileEntry) {

                    // Get a File object representing the file,
                    // then use FileReader to read its contents.
                    fileEntry.file(function(file) {
                        var reader = new FileReader();
                        reader.onloadend = function(e) {
                            deferred.resolve(this.result)
                        };
                        reader.readAsText(file);
                    }, errorHandler);

                }, errorHandler);
            }
            return deferred.promise;
        }
    }
})
//</editor-fold>

//<editor-fold desc="$sync">
sync.factory('$sync', function ($http,$q,$store) {
    var endpoint = 'http://adscreen.resources.s3.amazonaws.com/sync/'
    var resourcesWatchers = {}
    var resourceType = "application/json"
    var refresRate = 1000
    var notifyAll = function(resourceName,data)
    {
        for(var index in resourcesWatchers[resourceName])
        {
            resourcesWatchers[resourceName][index].notify({name:resourceName,content:data})
        }
    }

    var headResources = function(resourceName)
    {
        var deferred = $q.defer();
        $http.head(endpoint+resourceName+"?"+Math.random()).success(function (data, status, headers, config)
        {
            deferred.resolve(headers("Etag").replace(/"/g,""))
        })
        return deferred.promise;
    }

    var getResource = function(resourceName)
    {
        var deferred = $q.defer();
        $http.get(endpoint+resourceName).success(function (data, status, headers, config)
        {
            deferred.resolve(data)
        })
        return deferred.promise;
    }

    //<editor-fold desc="Core logic">
    var sync = function()
    {
        for(var resourceName in resourcesWatchers)
        {
            headResources(resourceName).then(function checkEtag(eTag)
            {
                var oldEtag = localStorage.getItem("$store_"+resourceName)
                if(oldEtag==undefined || oldEtag!=eTag)
                {
                    getResource(resourceName).then(function(content)
                    {
                        //Double check for network interference
                        if(oldEtag==undefined || oldEtag!=eTag)
                        {
                            $store.save(resourceName,JSON.stringify(content),resourceType).then(function()
                            {
                                localStorage.setItem("$store_"+resourceName,eTag)
                                notifyAll(resourceName,content)
                            })
                        }
                    })
                }
            })
        }
    }
    //</editor-fold>
    $store.ready.then(function()
    {
        setInterval(sync,refresRate)
    })

    return {
        ready: $store.ready,
        subscribe: function(resourceName)
        {
            var deferred = $q.defer();
            // Create watcher if any one watching
            if(!resourcesWatchers.hasOwnProperty(resourceName))
            {
                resourcesWatchers[resourceName] = []
            }
            resourcesWatchers[resourceName].push(deferred)

            $store.load(resourceName).then(function(data)
            {
                deferred.notify({name:resourceName,content:JSON.parse(data)})
            })
            return deferred.promise
        }
    }
})
//</editor-fold>