/**
 * Created by ProdUser on 4/29/2015.
 */
var express = require('express');
var AWS = require('aws-sdk');
var router = express.Router();

var mongoose = require('mongoose');
var Resources = mongoose.model('Resources');


router.get('/', function(req, res, next) {
    Resources.find(function(err, resp_resources){
        if(err){ return next(err); }
        res.json({data:resp_resources});
    });
});

router.post('/', function(req, res, next) {
    var resources = new Resources(req.body);
    resources.save(function(err, resp_resource){
        if(err){ return next(err); }

        var s3 = new AWS.S3({endpoint:'http://adscreen.resources.s3.amazonaws.com',s3BucketEndpoint:true});
        var params = {Bucket: 'adscreen.resources', Key: resp_resource._id+'',Expires:60*60*24, ContentType:resp_resource.type, ACL: 'public-read'};
        //TODO: Public read not good
        //TODO: Content type verification
        s3.getSignedUrl('putObject', params, function (err, url) {
            if(err){ return next(err); }
            console.log("Presign url "+url)
            resp_resource.preSignedURL = url
            res.json({data:resp_resource, preSignedUrl:url});
        });
    });
});


module.exports = router;
