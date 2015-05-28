/**
 * Created by Karen on 5/11/2015.
 */
'use strict';

var sync = angular.module('as.sync-tools', ['ngResource'])
//<editor-fold desc="$store: Storing binaries in persistent storage, managing available quota">
sync.factory('$store', function ($q) {
    var fileSystem = undefined
    var deferred = $q.defer()
    var grantedQuotaBytes = 1024*1024*1000 //In bytes 500MBs
    var usedQuotaBytes
    var onInitFsWithPromise = function(deferred)
    {
        return function onInitFs(fs) {
            fileSystem = fs
            console.log('Opened file system: ' + fs.name);
            deferred.resolve()
        }
    }

    var errorHanglerWithPromise = function(deferred)
    {
        return function errorHandler(e) {
            var msg = e.message;

            console.log('Error: ' + msg);
            deferred.reject()
        }
    }
    function requestQuotaWithPromise(requestQuotaBytes, deferred)
    {
        window.requestFileSystem(PERSISTENT, requestQuotaBytes, onInitFsWithPromise(deferred), errorHanglerWithPromise(deferred))
        navigator.webkitPersistentStorage.requestQuota(
            requestQuotaBytes,
            function( bytes ) {
                grantedQuotaBytes = bytes
                navigator.webkitPersistentStorage.queryUsageAndQuota(
                    function (usedBytes)
                    {
                        usedQuotaBytes = usedBytes
                    },
                    function(e)
                    {
                    }
                )
            },
            function( e ) {
                deferred.reject(e)
            }
        )
    }

    if(window.requestFileSystem == undefined)
    {
        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
        requestQuotaWithPromise(grantedQuotaBytes,deferred)
    }

    function loader(resource,type) {
        var deferred = $q.defer();
        if (fileSystem == undefined) {
            deferred.reject("No file system found!")
        }
        else {
            fileSystem.root.getFile(resource, {}, function (fileEntry) {
                // Get a File object representing the file,
                // then use FileReader to read its contents.
                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.onloadend = function (e) {
                        deferred.resolve(this.result)
                    };

                    if(type==0) //0-TEXT 1-BLOB
                        reader.readAsText(file)
                    else
                        reader.readAsArrayBuffer(file);
                    
                }, errorHanglerWithPromise(deferred));

            }, errorHanglerWithPromise(deferred));
        }
        return deferred.promise;
    }
    return {
        getQuota: function()
        {
            return {used:usedQuotaBytes, granted: grantedQuotaBytes}
        },
        setQuota: function(requestQuotaBytes)
        {
            var deferred = $q.defer()
            requestQuotaWithPromise(requestQuotaBytes,deferred)
        },
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
                    var src = fileEntry.toURL();
                    fileEntry.createWriter(function(fileWriter) {

                        fileWriter.onwriteend = function(e) {
                            deferred.resolve(src)
                        };

                        fileWriter.onerror = function(e) {
                            deferred.reject(e.toString());
                        };

                        // Create a new Blob and write it to log.txt.
                        var blob = new Blob([data], {type: type});

                        fileWriter.write(blob);

                    }, errorHanglerWithPromise(deferred));

                }, errorHanglerWithPromise(deferred));

            }
            return deferred.promise;
        },
        loadAsText: function(resource)
        {
            return loader(resource,0)
        },
        loadAsFile: function(resource)
        {
            return loader(resource,1)
        }
    }
})
//</editor-fold>


//<editor-fold desc="$download: Resumable download system, storing chunks of downloaded data persistently">
sync.factory('$download', function ($http,$q,$store) {

    var bytesChunk = 1024*256
    var parallelConnectionsPerEntity = 8
    if (SparkMD5 == undefined) {
        throw "Spark MD5 not found"
    }

    var EntityFactory =  (function($store,$q,$http)
    {

        return function downloadWorker (resourceURL) {
            var self = this //Public
            var _self = {} //Private

            var deferred = $q.defer()
            self.endPoint = resourceURL;
            self.id =SparkMD5.hash(resourceURL)
            _self.deferred = $q.defer()
            _self.dataChunks =JSON.parse(localStorage.getItem("$download_"+self.id+"dataChunks")) || [];
            _self.contentLength = localStorage.getItem("$download_"+self.id+"contentLength") || 0;
            _self.contentType = localStorage.getItem("$download_"+self.id+"contentType") || 0;


            _self.freeConnections  = parallelConnectionsPerEntity
            self.status = 0 //0-Idle 1-Downloading -1 - Pause
            self.promise = _self.deferred.promise
            _self.saveToDisk = function()
            {
                localStorage.setItem("$download_"+self.id+"dataChunks",JSON.stringify(_self.dataChunks));
                localStorage.setItem("$download_"+self.id+"contentLength",_self.contentLength);
                localStorage.setItem("$download_"+self.id+"contentType",_self.contentType);
            }
            _self.sendStatus = function()
            {
                setTimeout(function()
                {
                    var downloaded = _self.dataChunks.reduce(function(a,b)
                    {
                        if(typeof a == "object")
                        {
                            return parseInt(a.done && a.chunk || 0) + parseInt(b.done && b.chunk || 0)
                        }
                        else
                        {
                            return a + parseInt(b.done && b.chunk || 0)
                        }
                    })
                    _self.deferred.notify({target:self,status:self.status, downloaded:downloaded, total:_self.contentLength})
                },0)

            }



            self.resume = function()
            {
                if(self.status == 1)
                    return

                self.status = 1
                for(var i=0; i<_self.freeConnections; i++)
                {
                    setTimeout(_self.downloadChunk,0)
                }
            }
            self.pause = function()
            {
                self.status = -1
            }
            _self.cleanAndSave= function()
            {
                console.log("Saving file: "+self.endPoint)
                var allChunks = []
                for(var i=0; i<_self.dataChunks.length;i++)
                {
                    var loadKey = "$download"+self.id+"_"+i;

                    (function(ind){
                        allChunks[ind]=$store.loadAsFile(loadKey).then(
                            function(data)
                            {
                                _self.dataChunks[ind].data = data
                                console.log("File chunk "+_self.dataChunks[ind].range)
                            },function(err)
                            {
                                console.error("File chunk "+_self.dataChunks[ind].range+" not found!")
                            })
                    })(i)
                }
                $q.all(allChunks).then(function()
                {
                    var blob = new Blob(_self.dataChunks.map(function(chunk)
                    {
                        return new Blob([chunk.data],{type: _self.contentType})
                    }))


                    $store.save(self.id,blob, _self.contentType).then(function(src)
                    {
                        _self.deferred.resolve({target:self,status:self.status, total:_self.contentLength,url:src})
                    })
                })


            }
            _self.downloadChunk = function()
            {
                var freeChunks = _self.dataChunks.filter(function(chunk)
                {
                    return chunk.done==false && chunk.processing == undefined
                })

                if(freeChunks.length == 0 || _self.freeConnections == 0 || self.status != 1)
                {
                    /* Wait others to finish */
                    return
                }
                else
                {
                    freeChunks[0].processing = true
                    _self.freeConnections--
                    console.log("Download: "+freeChunks[0].chunk)
                    $http.get(self.endPoint, {
                        headers: {'Range': "bytes="+freeChunks[0].range},
                        responseType: 'blob'
                    }).success(function (data, status, headers, config) {
                        var storeKey = "$download"+self.id+"_"+_self.dataChunks.indexOf(freeChunks[0])
                        console.log("Recieving: "+(new Blob([data])).size)

                        $store.save(storeKey,data, "application/octet-stream").then(function()
                        {
                            delete freeChunks[0].processing
                            freeChunks[0].done = true
                            _self.freeConnections++
                            _self.sendStatus()

                            var doneChunks = _self.dataChunks.filter(function(chunk){ return chunk.done })
                            if(doneChunks.length == _self.dataChunks.length)
                            {
                                _self.cleanAndSave()
                            }
                            else
                            {
                                _self.downloadChunk()
                            }
                        })
                    }).error(function (data, status) {
                        console.error('Chunk download error '+freeChunks[0].range)
                        delete freeChunks[0].processing
                        freeChunks[0].done = false
                        _self.freeConnections++
                        setTimeout(_self.downloadChunk,500)
                    })
                }
            }



            if(_self.contentLength==0) {
                $http.head(resourceURL).success(function (data, status, headers, config) {
                    _self.contentLength = parseInt(headers("Content-Length"))
                    _self.contentType = headers("Content-Type")

                    var bytes=0
                    for(; bytes+bytesChunk<_self.contentLength; bytes+=bytesChunk)
                    {
                        _self.dataChunks.push({range:bytes+"-"+(bytes+bytesChunk-1),chunk:bytesChunk,done:false})
                    }
                    _self.dataChunks.push({range:bytes+"-"+(_self.contentLength - 1),chunk:_self.contentLength - bytes ,done:false})
                    _self.saveToDisk()
                    _self.sendStatus()
                    deferred.resolve(self)
                }).error(function (data, status) {
                    console.error('Head error', status, data)
                    deferred.reject(self)
                })
            }
            else
            {
                _self.sendStatus()
                deferred.resolve(self)
            }
            return deferred.promise;
        }
    })($store,$q,$http)

    return {
        ready: $store.ready,
        resume:{},
        download:function(resourceURL)
        {
            return new EntityFactory(resourceURL)

        },
        getTasks:{},
        getProgress:{}
    }
})
//</editor-fold>


//<editor-fold desc="$sync: Watcher for resources in cloud constantly syncing with local version">
sync.factory('$sync', function ($http,$q,$store) {
    var endpoint = 'http://adscreen.resources.s3.amazonaws.com/sync/'
    var resourcesWatchers = {}
    var resourceType = "application/json"
    var refreshRate = 1000
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
        setInterval(sync,refreshRate)
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

            $store.loadAsText(resourceName).then(function(data)
            {
                deferred.notify({name:resourceName,content:JSON.parse(data)})
            },function(err)
            {
                localStorage.setItem("$store_"+resourceName,0)
                console.warn("File "+resourceName+" not found, remove tag")
            })
            return deferred.promise
        }
    }
})
//</editor-fold>