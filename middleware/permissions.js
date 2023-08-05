const checkAdminRole = (req, res, next) => {
  const user = req.user;
  console.log('check Admin user', user);
  if (!user || !user.role || user.role !== 'admin') {
    const error = new Error('Unauthorized');
    // error.statusCode = 401;
    // return next(error);
  }

  return next();
};

module.exports = { checkAdminRole };
