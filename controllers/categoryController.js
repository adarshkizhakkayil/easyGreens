const categories = require('../models/categoryModel');
const Offer = require('../models/offerModel');
const moment = require('moment')


const loadCategory = async (req, res) => {

    try {
        const categoryCollection = await categories.find();
        const availableOffers = await Offer.find()
        res.render('category', { category: categoryCollection,availableOffers })

    } catch (error) {

        res.status(500).render('error')
    }
}


const addCategories = async (req, res) => {
    try {
        const category = req.body.categoryname;
        const existingCategory = await categories.findOne({
            categoriesName: { $regex: new RegExp(`^${category}$`, 'i') }
        });

        if (existingCategory) {
            res.status(400).json({ error: `${category} already exists`, value: 0 });
        } else {
            const addcategory = new categories({
                categoriesName: category,
                is_listed: 0
            });

            const submitdata = await addcategory.save();
            res.status(200).json({ message: 'New category added', value: 1 , showAlert: true});
        }
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



const listCategory = async (req, res) => {
    try {
        console.log('helloo');
        const categoryId = req.body.id
        const findcategory = await categories.findById({ _id: categoryId });
        findcategory.is_listed = false;
        const data = await findcategory.save()
        if (data) {
            res.json({ message: "listed" })

        }
    } catch (error) {
        res.status(500).render('error')
    }
}


const UnlistCategory = async (req, res) => {
    try {
        console.log('heeyy');
        const categoryId = req.body.id
        const findcategory = await categories.findById({ _id: categoryId });
        findcategory.is_listed = true;
        const data = await findcategory.save()
        if (data) {
            res.json({ message: "unlisted" })

        }
    } catch (error) {

        res.status(500).render('error')
    }
}

const loadEditCategory = async (req, res) => {
    try {
        const id = req.query.id
        const name = await categories.findById({ _id: id })
        res.render('edit-category', { catId: id, name })
    } catch (error) {
        res.status(500).render('error')
    }
}

const editCategory = async (req, res) => {
    try {
        const id = req.body.id
        const name = req.body.categoryName
        const existingCategory = await categories.findOne({
            categoriesName: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if(!existingCategory){
            const update = await categories.findByIdAndUpdate({_id : id},{
                categoriesName : name
            });
            const save  = await update.save();    
            res.json({message : 'added category',value :0})
        }else{
            res.json({message : 'category already exists',value : 1})
        }

    } catch (error) {

        res.status(500).render('error')
    }
}




module.exports = {
    loadCategory,
    addCategories,
    loadEditCategory,
    editCategory,
    listCategory,
    UnlistCategory
}