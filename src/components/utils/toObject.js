const toObject = (array, iteratee) => {
  return array.reduce((returnObj, a) => {
    const [key, value] = iteratee(a);
    return {
      ...returnObj,
      [key]: value,
    };
  }, {});
};

export default toObject;
