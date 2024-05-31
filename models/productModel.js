const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    image: {
        type: Array,
        required: true
    },

    description: {
        type: String,
        required: true
    },
    // detailedDescription: {
    //     type: String,
    //     required: true
    // },

    Prize: {
        type: Number,
        required: true
    },
    weight: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "categories"
    },

    is_listed: {
        type: Number,
        default: 0
    },

    ratings: {
        star: Number,
        Comment: String,
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    }

}, { timestamps: true })


module.exports = mongoose.model('products', productSchema);
