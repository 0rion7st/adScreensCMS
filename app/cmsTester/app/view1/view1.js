'use strict';

angular.module('myApp.view1', ['ngRoute'])

    .config(['$routeProvider', function($routeProvider) {
      $routeProvider.when('/view1', {
        templateUrl: 'view1/view1.html',
        controller: 'View1Ctrl'
      });
    }])

    .controller('View1Ctrl', ['$scope','$http',function($scope, $http) {
      $scope.getFileUrl = function()
      {
        $http.post('http://localhost:3000/resources', {md5:$scope.md5,type:$scope.type}).
            success(function(data, status, headers, config) {
               // $http({'withCredentials':true});
                $http.put(data.preSignedUrl,$scope.image,{
                    headers:{
                        'Content-Type': 'application/octet-stream'
                    }})

                 }).
            error(function(data, status, headers, config) {
              // called asynchronously if an error occurs
              // or server returns response with an error status.
            });
      }

      $scope.file_changed = function(element) {

        var photofile = element.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
          $scope.$apply(function() {
            $scope.image = e.target.result;
            $scope.md5=123
            $scope.type='application/unknown'
            $scope.getFileUrl()
          });
        };
        reader.readAsDataURL(photofile);
      };

        $scope.$on("MD5", function(evt,val)
        {

            console.log("md5 view1: "+Math.floor(val.value*100)+"%")

        });

        $scope.$on("Resource", function(evt,val)
        {

            console.log("Resource link: "+val.value)

        });

    }]);