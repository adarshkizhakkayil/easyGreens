const mongoose = require("mongoose");

const connectDatabase = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/easygreens", {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // useCreateIndex: true,
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
    }
};

module.exports = connectDatabase;