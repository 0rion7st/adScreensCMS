/**
 * Created by Karen on 5/18/2015.
 */
var toolboxModule = angular.module('as.toolbox', [])

toolboxModule.directive('asAsset', function ($q, $http,$server) {
        return {
            restrict: 'E',
            replace: false,
            link: function ($scope, elements, attrs) {
                console.log("asImage link init "+elements)

            },
            controller: function($scope)
            {
                console.log("asImage controller init "+JSON.stringify($scope.model))

            }
        };
    });

toolboxModule.directive('asTransformable', function ($q, $http,$server) {
    return {

        restrict: 'A',
        require: 'asImage',
        replace: false,
        scope:
        {
            model:'=',
            editable:'=?'
        },
        link: function (scope, elements, attrs,assetCtrl) {
            console.log("asTransformable link init "+elements)
            elements[0].style.border = "1px solid red";
        },
        controller: function($scope)
        {
            console.log("asTransformable controller init "+JSON.stringify($scope.model))
        }
    };
});