/**
 * Created by ProdUser on 27/04/2015.
 */
var mongoose = require('mongoose');

var AdsSchema = new mongoose.Schema({
    caption: String,
    created_at:  { type: Date, default: Date.now },
    duration: Number,
    type: Number,
    transition: Number,
    content:mongoose.Schema.Types.Mixed
}, { versionKey: false });


mongoose.model('Ads', AdsSchema);