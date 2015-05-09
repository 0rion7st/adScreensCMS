/**
 * Created by ProdUser on 4/29/2015.
 */
var mongoose = require('mongoose');

var ResourcesSchema = new mongoose.Schema({
    md5: String,
    path: String,
    type: String
});



mongoose.model('Resources', ResourcesSchema);