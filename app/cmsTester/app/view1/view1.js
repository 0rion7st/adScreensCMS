'use strict';

angular.module('myApp.view1', ['ngRoute'])

    .config(['$routeProvider', function($routeProvider) {
      $routeProvider.when('/view1', {
        templateUrl: 'view1/view1.html',
        controller: 'View1Ctrl'
      });
    }])

    .controller('View1Ctrl', function($scope, $server,$sync,$download) {

        //$scope.resources = $server.resources.query()
        $scope.sync  = function()
        {
            $server.sync.get()
        }
        $scope.$on("Resource", function(evt,obj)
        {
           if(obj.type="done")
           {
               $scope.resources = $server.resources.query()
           }
        })
        function getResourceUpdate(resource)
        {
            $scope.resources = resource.content
            console.log("Got update: "+resource.name)
        }

       $sync.ready.then(function()
       {
         // $sync.subscribe("resources.json").then(null,null,getResourceUpdate)
       });
        $download.download("https://s3-eu-west-1.amazonaws.com/adscreen.resources/resources/5551b54f4ca1efc81d7ed9b7").then(function(entity)
        {
            $scope.entity = entity
            $scope.entity.resume()
            var start = (new Date()).getTime()
            $scope.entity.promise.then(function(ev)
            {
                var end = (new Date()).getTime()
                console.log("Download complete in: "+Math.floor(end-start)/1000)

                document.getElementById('testImg').src = ev.url

            },null,function(va)
            {


            })
        })
        $scope.dummyModel={ resource:"bla"}



    });