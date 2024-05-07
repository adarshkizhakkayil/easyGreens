const mongoose  = require('mongoose');


const categorySchema = mongoose.Schema({
    categoriesName : {
        type : String,
        required : true
    },
    
    is_listed : {
        type : Number,
        default : 0
    },
    offer : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Offer'
    }
})


module.exports = mongoose.model('categories',categorySchema);

