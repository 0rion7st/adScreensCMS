/**
 * Created by Karen on 5/9/2015.
 */
'use strict';

var server = angular.module('as.server', ['ngResource'])
//<editor-fold desc="$serverAPI">
server.factory('$serverAPI', function ($resource) {
    var endpoint = 'http://localhost:3000/'

    return {
        resources: $resource(endpoint + 'resources'),
        sync: $resource(endpoint + 'sync')
    }
})
//</editor-fold>


