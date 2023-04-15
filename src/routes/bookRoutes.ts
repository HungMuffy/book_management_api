import express, { Router } from 'express';
import BookController from '../controllers/bookController';
import reviewRouter from './reviewRoutes';
import authController from '../controllers/authController';

const router: Router = express.Router();

router.use('/:tourId/reviews', reviewRouter);

router
  .route('')
  .get(BookController.getAllBook)
  .post(authController.protect, authController.restrictTo('admin'), BookController.createBook);

router
  .route('/:id')
  .get(BookController.getBook)
  .patch(authController.protect, authController.restrictTo('admin'), BookController.updateBook)
  .delete(authController.protect, authController.restrictTo('admin'), BookController.deleteBook);

export default router;
