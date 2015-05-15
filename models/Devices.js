/**
 * Created by ProdUser on 27/04/2015.
 */
var mongoose = require('mongoose');

var DevicesSchema = new mongoose.Schema({
    id: String,
    model: mongoose.Schema.Types.Mixed,
    resolution: {width:Number, height: Number},
    landscape: Boolean
}, { versionKey: false });

mongoose.model('Devices', DevicesSchema);