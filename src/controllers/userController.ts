import catchAsync from '../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import User from '../models/user';
import AppError from '../utils/appError';
import factory from '../controllers/handleFactory';
import multer, { Multer } from 'multer';
import sharp from 'sharp';
import Stripe from 'stripe';
import UserFinancials from '../models/userFinancials';
import UserTransaction from '../models/userTransaction';
import Reader from '../models/reader';
import { calculateAge } from '../utils/dateUtils';
import { AuthRequest, IUser, IUserFinancials } from '../interfaces/model.interfaces';
import Book from '../models/book';

const getAllUsers = factory.getAll(User);
const getUser = factory.getOne(User);
const deleteUser = factory.deleteOne(User);
const deleteMe = factory.deleteOne(User);

const upload: Multer = multer({
  storage: multer.memoryStorage()
});
const uploadAvatar = upload.single('avatar');

const getMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.params.id = req.user.id;
  next();
});

const filterObj = (obj: { [key: string]: any }, ...allowedFields: string[]) => {
  const newObj: { [key: string]: any } = {};

  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const updateMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let userId = req.user.id;
  if (req.params.id && req.user.role === 'admin') {
    userId = req.params.id;
  } else {
    return next(new AppError(`This route is not implemented!!`));
  }
  // 1) Create an error if user tries to POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(`This route is not for password updates. Please use /update-my-password`)
    );
  }

  // 2) Filter out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'firstName', 'lastName');
  if (req.file) {
    filteredBody.avatar = req.file?.buffer;
  }

  const user = await User.findByIdAndUpdate(userId, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

const getAvatar = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user: IUser | null = await User.findById(req.params.id).select('+avatar');
  if (!user) {
    return res.status(404).json({ message: 'User not found!' });
  }

  const avatar: Buffer | undefined = user.avatar;
  let resizeValue = null;
  if (req.query.resize) {
    resizeValue = Number(req.query.resize);
  }
  const sharpImage = await sharp(avatar).resize(resizeValue).sharpen().toBuffer();
  // Set content-type header to image/jpeg
  res.setHeader('Content-Type', 'image/jpeg');
  // Send sharpened image to client
  return res.send(sharpImage);
});

const deactivate = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(200).json({
    status: 'success',
    data: null
  });
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15'
});

const topUp = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.body.money) {
    return next(new AppError(`Please add money.`, 400));
  }
  const user = req.user.id;

  let userFinancials: IUserFinancials | null = await UserFinancials.findOne({ user });
  if (!userFinancials) {
    userFinancials = await UserFinancials.create({ user });
  }
  await UserTransaction.create({ userFinancials: userFinancials._id, money: req.body.money });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `https://nhom-18-e-library.vercel.app/landing/transactionSuccess/${req.user.id}`,
    cancel_url: `${req.protocol}://${req.get('host')}/api/v1/user-transactions?user=${
      userFinancials._id
    }&status=fail`,
    customer_email: req.user.email,
    client_reference_id: req.user.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          product_data: {
            name: `The Payment Card`,
            description: 'This is the card used to user depositing into their account!',
            images: ['https://i.pinimg.com/564x/9a/95/6a/9a956ab8bd50e129748b0760e869e3b2.jpg']
          },
          unit_amount: Number(req.body.money) * 100
        }
      }
    ],
    mode: 'payment'
  });

  res.status(200).json({
    status: 'success',
    session
  });
});

const changeRegulations = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const ReaderSchema = Reader.schema;
  if (req.body.ageMin || req.body.ageMax || req.body.expiredMonth) {
    ReaderSchema.path('dateOfBirth').validators = [
      {
        validator: function (value: Date) {
          const age = calculateAge(value);
          return age >= (Number(req.body.ageMin) || 18) && age <= (Number(req.body.ageMax) || 55);
        },
        message: `Reader age must be between ${Number(req.body.ageMin) || 18} and ${
          Number(req.body.ageMax) || 55
        }`
      }
    ];

    ReaderSchema.path('expiredDate').default(
      () => new Date(Date.now() + Number(req.body.expiredMonth) || 6)
    );
  }

  const BookSchema = Book.schema;
  if (req.body.numberOfBooks || req.body.publicationYear) {
    BookSchema.path('numberOfBooks').validators = [
      {
        validator: function (numOfBooks: number) {
          return numOfBooks < (Number(req.body.numberOfBooks) || 100);
        },
        message: `Number of books must be less than or equal ${
          Number(req.body.numberOfBooks) || 100
        }`
      }
    ];

    BookSchema.path('publicationYear').validators = [
      {
        validator: function (publicationYear: number) {
          return (
            new Date().getFullYear() - publicationYear <= Number(req.body.publicationYear) || 8
          );
        },
        message: `Only accept books published within the last ${
          req.body.publicationYear || 8
        } years.`
      }
    ];
  }

  res.status(200).json({
    status: 'successful update'
  });
});

export default {
  getAllUsers,
  getUser,
  deleteUser,
  getMe,
  deleteMe,
  updateMe,
  getAvatar,
  uploadAvatar,
  deactivate,
  topUp,
  changeRegulations
};
