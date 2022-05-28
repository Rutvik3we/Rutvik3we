//const { Promise } = require("mongoose");
const Product = require("../models/productModel");
const ErrorHander = require("../utils/errorhander");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ApiFeatures = require("../utils/apifeatures");
const cloudinary = require("cloudinary");

//const User = require("../models/userModels");





// Create Product -- Admin
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  let Images = [];

  if (typeof req.body.Images === "string") {
    Images.push(req.body.Images);
  } else {
    Images = req.body.Images;
  }

  const imagesLinks = [];

  for (let i = 0; i < Images.length; i++) {
    const result = await cloudinary.v2.uploader.upload(Images[i], {
      folder: "products",
    });

    imagesLinks.push({
      public_id: result.public_id,
      url: result.secure_url,
    });
  }

  req.body.Images = imagesLinks;
  req.body.user = req.user.id;

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    product,
  });
});

// Get All Product
exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const resultPerPage = 8;
  const productsCount = await Product.countDocuments();

  const apiFeatures = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter().pagination(resultPerPage);

  
  const products = await apiFeatures.query;

  res.status(200).json({
    success: true,
    products,
    productsCount,
    resultPerPage,
    
  });
});

// Get All Product (Admin)
exports.getAdminProducts = catchAsyncErrors(async (req, res, next) => {
  const products = await Product.find();

  res.status(200).json({
    success: true,
    products,
  });
});

// Get Product Details

exports.getProductDetails = catchAsyncErrors(async(req,res,next)=>{

    

    const product = await Product.findById(req.params.id);
    if(!product){
        return next(new ErrorHander("Product Not Found",404));
    }
    res.status(200).json({
        success:true,
        product
    })
})

//Update Product -- Admin

exports.updateProduct = catchAsyncErrors(async (req,res,next)=>{

    let product = await Product.findById(req.params.id);
    if(!product){
        return next(new ErrorHander("Product Not Found",404));
    }

    
  // Images Start Here
  let Images = [];

  if (typeof req.body.Images === "string") {
    Images.push(req.body.Images);
  } else {
    Images = req.body.Images;
  }

  if (Images !== undefined) {
    // Deleting Images From Cloudinary
    for (let i = 0; i < product.Images.length; i++) {
      await cloudinary.v2.uploader.destroy(product.Images[i].public_id);
    }

    const imagesLinks = [];

    for (let i = 0; i < Images.length; i++) {
      const result = await cloudinary.v2.uploader.upload(Images[i], {
        folder: "products",
      });

      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }

    req.body.Images = imagesLinks;
  }


    product = await Product.findByIdAndUpdate(req.params.id,req.body,{
        new:true,
        runValidators:true,
        useFindAndModify:false
    });

    res.status(200).json({
        success:true,
        product
    })
})

// Delete Product

exports.deleteProduct = catchAsyncErrors(async(req,res,next)=>{
    const product = await Product.findById(req.params.id);

    if(!product){
        return next(new ErrorHander("Product Not Found",404));
    }
     // Deleting Images From Cloudinary
  for (let i = 0; i < product.Images.length; i++) {
    await cloudinary.v2.uploader.destroy(product.Images[i].public_id);
  }

  
await product.remove();
res.status(200).json({
    success:true,
    message:"Product Delete Successfully"
})

})

// Create New Review or Update the review
exports.createProductReview = catchAsyncErrors(async (req, res, next) => {
    const { rating, comment, productId } = req.body;
  
    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    };
  
    const product = await Product.findById(productId);
  
    const isReviewed = product.reviews.find(
      (rev) => rev.user.toString() === req.user._id.toString()
    );
  
    if (isReviewed) {
      product.reviews.forEach((rev) => {
        if (rev.user.toString() === req.user._id.toString())
          (rev.rating = rating), (rev.comment = comment);
      });
    } else {
      product.reviews.push(review);
      product.numOfReviews = product.reviews.length;
    }
  
    let avg = 0;
  
    product.reviews.forEach((rev) => {
      avg += rev.rating;
    });
  
    product.ratings = avg / product.reviews.length;
  
    await product.save({ validateBeforeSave: false });
  
    res.status(200).json({
      success: true,
    });
  });
  
  // Get All Reviews of a product
  exports.getProductReviews = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.query.id);
  
    if (!product) {
      return next(new ErrorHander("Product not found", 404));
    }
  
    res.status(200).json({
      success: true,
      reviews: product.reviews,
    });
  });
  
  // Delete Review
exports.deleteReview = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.query.productId);
  
    if (!product) {
      return next(new ErrorHander("Product not found", 404));
    }
  
    const reviews = product.reviews.filter(
      (rev) => rev._id.toString() !== req.query.id.toString()
    );
  
    let avg = 0;
  
    reviews.forEach((rev) => {
      avg += rev.rating;
    });
  
    const ratings = avg / reviews.length;
    
    const numOfReviews = reviews.length;
  
    await Product.findByIdAndUpdate(
      req.query.productId,
      {
        reviews,
        ratings,
        numOfReviews,
      },
      {
        new: true,
        //runValidators: true,
        useFindAndModify: false,
      }
    );
  
    res.status(200).json({
      success: true,
    });
  });