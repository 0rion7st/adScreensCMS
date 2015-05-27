'use strict';

angular.module('myApp.view1', ['ngRoute'])

    .config(['$routeProvider', function($routeProvider) {
      $routeProvider.when('/view1', {
        templateUrl: 'view1/view1.html',
        controller: 'View1Ctrl'
      });
    }])

    .controller('View1Ctrl', function($scope, $server,$sync) {

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
           $sync.subscribe("resources.json").then(null,null,getResourceUpdate)
       });

        $scope.dummyModel={ resource:"bla"}



    });