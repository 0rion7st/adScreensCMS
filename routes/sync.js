/**
 * Created by Karen on 5/9/2015.
 */
/**
 * Created by Karen on 4/29/2015.
 */
var express = require('express');
var AWS = require('aws-sdk');
var router = express.Router();

var mongoose = require('mongoose');
var Resources = mongoose.model('Resources');
var config = require('../config');


router.get('/', function(req, res, next) {
    Resources.find(function(err, resp_resources){
        if(err){ return next(err); }
        var s3 = new AWS.S3({endpoint:config.s3bucket,s3BucketEndpoint:true});
        var params = {Bucket: config.s3bucketName, Key: config.syncFolder + 'resources.json',  ACL: 'public-read', ContentType:'application/json',Body: JSON.stringify(resp_resources)};
        //TODO: Public read not good
        s3.upload( params, function (err) {
            if(err){ return next(err); }
            res.json();
        });

    });
});



module.exports = router;
