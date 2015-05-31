'use strict';

angular.module('myApp.view1', ['ngRoute'])

    .config(['$routeProvider', function($routeProvider) {
      $routeProvider.when('/view1', {
        templateUrl: 'view1/view1.html',
        controller: 'View1Ctrl'
      });
    }])

    .controller('View1Ctrl', function($scope, $server,$sync,$download,$store) {

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

        $store.ready.then(function()
        {
            $scope.availableQuota = $store.getQuota()
        })
        $scope.downloadList = []
        $scope.addEntity = function(process)
        {
            if(process.entity.status==0 || process.entity.status==1) //Not downloaded
            {
                process.entity.resume()
            }

            $scope.downloadList.push(process)
            var index = $scope.downloadList.indexOf(process)
            $scope.downloadList[index].entity.promise.then(function(ev)
            {
                $scope.downloadList[index].link = ev.url

            },function(ev)
            {
                $scope.error = ev

            },function(ev)
            {
                $scope.downloadList[index].progress = Math.floor(ev.downloaded/ev.total*100)

            })
        }

        $scope.addQuota = function(mbytes)
        {
            $store.setQuota(($scope.availableQuota.granted + 100*1024*1024)).then(function()
            {
                $scope.availableQuota = $store.getQuota()
                $scope.error=undefined
            })
        }
        $scope.resumeEntity = function(index)
        {
            $scope.downloadList[index].entity.resume()
        }

        $scope.pauseEntity = function(index)
        {
            $scope.downloadList[index].entity.pause()
        }

        $download.ready().then(function()
        {
            for(var i=0; i<$download.list.length; i++)
            {
                $scope.addEntity($download.list[i])
            }
        })

        $scope.addDownload = function()
        {
            $download.add({name:'test'+Math.random(),url:'https://s3-eu-west-1.amazonaws.com/adscreen.resources/resources/VirtualRealPorn.com_-_Love_and_Sex_-_Trailer.mp4?'+Math.random()}).then($scope.addEntity)
        }
        $scope.dummyModel={ resource:"bla"}



    });