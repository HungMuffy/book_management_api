import express, { Router } from 'express';
import authController from './../controllers/authController';
import userController from '../controllers/userController';
const router: Router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.logIn);
router.post('/refresh', authController.refreshToken);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.get('/:id/avatar', userController.getAvatar);

router.use(authController.protect);
router.get('/me', userController.getMe, authController.getMe);
router.post('/deleteMe', userController.getMe, userController.deleteMe);
router.patch('/updateMe', userController.uploadAvatar, userController.updateMe);
router.post('/logout', authController.logOut);

router.use(authController.restrictTo('admin'));
router.route('/').get(userController.getAllUsers);
router.route('/:id').get(userController.getUser).delete(userController.deleteUser);

export default router;
