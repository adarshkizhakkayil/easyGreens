const mongoose  = require('mongoose');


const categorySchema = mongoose.Schema({
    categoriesName : {
        type : String,
        required : true
    },
    
    is_listed : {
        type : Number,
        default : 0
    }
})


module.exports = mongoose.model('categories',categorySchema);

