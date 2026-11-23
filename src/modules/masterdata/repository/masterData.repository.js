const findByName = async (Model, name) => {
  return await Model.findOne({
    name: name.trim(),
  });
};

const create = async (Model, data) => {
  return await Model.create(data);
};

const findAll = async (
  Model,
  {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    isActive,
  }
) => {
  const filter = {};

  // Search
  if (search) {
    filter.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        code: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Filter
  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  // Sort
  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  // Pagination
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit),

    Model.countDocuments(filter),
  ]);

  return {
    data,
    total,
  };
};

const findById = async (Model, id) => {
  return await Model.findById(id);
};

const updateById = async (Model, id, data) => {
  return await Model.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};

const deleteById = async (Model, id) => {
  return await Model.findByIdAndDelete(id);
};

export {
  findByName,
  create,
  findAll,
  findById,
  updateById,
  deleteById,
};