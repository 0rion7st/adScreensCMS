/**
 * Created by Karen on 5/9/2015.
 */
'use strict';

angular.module('as.resources', [])

    .directive('asUploadBtn', function ($q, $http,$serverAPI) {
        return {
            transclude: true,
            restrict: 'E',
            replace: true,
            templateUrl: 'components/resources/resources-upload-btn.html',
            link: function ($scope, element, attrs) {


                //<editor-fold desc="Calculate file content MD5">
                function calcMD5() {
                    console.log("calculate md5")
                    var file = $scope.selectedFile
                    var deferred = $q.defer();
                    if (SparkMD5 == undefined) {
                        throw "Spark MD5 not found"
                    }
                    var spark = new SparkMD5.ArrayBuffer();

                    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
                        chunkSize = 2097152,                               // read in chunks of 2MB
                        chunks = Math.ceil(file.size / chunkSize),
                        currentChunk = 0

                    function loadNext() {
                        var fileReader = new FileReader();
                        fileReader.onload = function (e) {
                            console.log("read chunk nr", currentChunk + 1, "of", chunks);
                            $scope.$emit("MD5", {type: "process", value: currentChunk / chunks})
                            deferred.notify(currentChunk / chunks)
                            spark.append(e.target.result);                 // append array buffer
                            currentChunk++;
                            if (currentChunk < chunks) {
                                loadNext();
                            }
                            else {
                                $scope.MD5 = spark.end();
                                deferred.resolve($scope.MD5)
                            }
                        };
                        fileReader.onerror = function () {
                            var errorMsg = "Error in producing MD5!"
                            throw( new Error(errorMsg) );
                            deferred.reject(errorMsg);
                        }
                        var start = currentChunk * chunkSize,
                            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
                        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
                    }

                    loadNext()
                    return deferred.promise;
                }

                //</editor-fold>

                //<editor-fold desc="Select image type">
                function selectImageType() {
                    var deferred = $q.defer();
                    console.log("selecting type")
                    var type = $scope.selectedFile.type;
                    if (type.indexOf("image") == -1 && type.indexOf("video") == -1) {
                        deferred.reject("File type not supported.")
                    }
                    else {
                        $scope.type = type
                        deferred.resolve(type)
                    }
                    return deferred.promise;
                }

                //</editor-fold>

                //<editor-fold desc="Request url for upload">
                function requestUpload() {
                    var deferred = $q.defer();
                    console.log("requesting upload")

                    $serverAPI.resources.save({md5: $scope.MD5, type: $scope.type},function (data, status, headers, config) {
                            $scope.uploadUrl = data.preSignedUrl
                            $scope.resourceUrl =  data.preSignedUrl.split("?")[0];
                            deferred.resolve()
                        },function (data, status, headers, config) {
                            deferred.reject(data)
                        })

                    return deferred.promise;
                }

                //</editor-fold>

                //<editor-fold desc="Generate preview">
                function generatePreview() {
                    console.log("generating preview")
                    var deferred = $q.defer();
                    if($scope.type.indexOf("image")!=-1)
                    {
                        var reader  = new FileReader();
                        reader.onloadend = function () {
                            $scope.preview = reader.result;
                            deferred.resolve()
                        }
                        reader.readAsDataURL($scope.selectedFile);
                    }
                    else
                    {
                        /*
                        Implement getting video poster
                         */
                        $scope.preview = "video.jpg"
                        deferred.resolve()
                    }

                    return deferred.promise;
                }

                //</editor-fold>

                //<editor-fold desc="Upload file to S3">
                function uploadFile() {
                    console.log("upload image")
                    var deferred = $q.defer();
                    $http.put($scope.uploadUrl,$scope.selectedFile,{
                        headers:{
                            'Content-Type': $scope.type,
                             Accept: 'application/json, text/javascript, */*'
                        }})
                        .success(function(data, status, headers, config) {
                            $scope.$emit("Resource", {type: "done", value:$scope.resourceUrl})
                            $scope.done=true
                            deferred.resolve()
                    }).
                        error(function(data, status, headers, config) {
                           deferred.reject(data)
                        });

                    return deferred.promise;
                }

                //</editor-fold>

                //<editor-fold desc="Error handling">
                function errorHandler(error) {
                    console.error("Resource upload: " + error);
                }

                //</editor-fold>

                element[0].onchange = function (evt) {
                    $scope.selectedFile = evt.target.files[0]
                    $scope.$emit("Resource", {type: "start", value:$scope.resourceUrl})
                    $scope.done = false
                    selectImageType()
                        .then(generatePreview)
                        .then(calcMD5)
                        .then(requestUpload)
                        .then(uploadFile)
                        .catch(errorHandler)
                }
            }
        }
            ;
    });
