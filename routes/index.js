var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Ads = mongoose.model('Ads');
var Devices = mongoose.model('Devices');

router.get('/ads', function(req, res, next) {
  Ads.find(function(err, ads){
    if(err){ return next(err); }
    res.json(ads);
  });
});

router.post('/ads', function(req, res, next) {
  var ad = new Ads(req.body);
  ad.save(function(err, post){
    if(err){ return next(err); }
    res.json(ad);
  });
});


module.exports = router;
