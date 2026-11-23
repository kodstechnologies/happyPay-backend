import ApiError from "../../../utils/ApiError.js";

import {
  findByName,
  create,
  findAll,
  findById,
  updateById,
  deleteById,
} from "../repository/masterData.repository.js";


/* ==============================
   Create Master Data
============================== */

const generateCodeFromName = async (Model, name) => {
  const base =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "ITEM";

  let code = base;
  let counter = 2;

  while (await Model.findOne({ code })) {
    code = `${base}_${counter}`;
    counter += 1;
  }

  return code;
};

const createMasterData = async (Model, payload) => {
  const { name, code, description } = payload;

  if (!name || !name.trim()) {
    throw ApiError.badRequest("Name is required");
  }

  const existing = await findByName(Model, name);

  if (existing) {
    throw ApiError.conflict("Already exists");
  }

  const requiresCode = Boolean(Model.schema.path("code")?.isRequired);
  const resolvedCode = code?.trim()
    ? code.trim()
    : requiresCode
      ? await generateCodeFromName(Model, name)
      : null;

  return await create(Model, {
    name: name.trim(),

    ...(resolvedCode && {
      code: resolvedCode,
    }),

    ...(description && {
      description: description.trim(),
    }),
  });
};


/* ==============================
   Get All Master Data
============================== */

const getAllMasterData = async (Model, query) => {
  let {
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
    isActive,
  } = query;


  /* ==============================
     Pagination Validation
  ============================== */

  page = Number(page);
  limit = Number(limit);

  if (page < 1 || Number.isNaN(page)) {
    page = 1;
  }

  if (limit < 1 || Number.isNaN(limit)) {
    limit = 10;
  }

  // Maximum records per request
  if (limit > 100) {
    limit = 100;
  }


  /* ==============================
     Active Status Filter
  ============================== */

  if (isActive !== undefined) {
    if (isActive === "true") {
      isActive = true;
    } else if (isActive === "false") {
      isActive = false;
    } else {
      throw ApiError.badRequest(
        "isActive must be true or false"
      );
    }
  }


  /* ==============================
     Sort Validation
  ============================== */

  const allowedSortFields = [
    "name",
    "code",
    "createdAt",
    "updatedAt",
  ];

  if (!allowedSortFields.includes(sortBy)) {
    throw ApiError.badRequest(
      `Invalid sort field. Allowed fields: ${allowedSortFields.join(", ")}`
    );
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    throw ApiError.badRequest(
      "sortOrder must be asc or desc"
    );
  }


  /* ==============================
     Fetch Data
  ============================== */

  const result = await findAll(Model, {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    isActive,
  });


  /* ==============================
     Pagination
  ============================== */

  const totalPages = Math.ceil(
    result.total / limit
  );


  /* ==============================
     Response
  ============================== */

  return {
    data: result.data,

    meta: {
      pagination: {
        total: result.total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    },
  };
};


/* ==============================
   Get Master Data By ID
============================== */

const getMasterDataById = async (Model, id) => {
  const data = await findById(Model, id);

  if (!data) {
    throw ApiError.notFound("Data not found");
  }

  return data;
};


/* ==============================
   Update Master Data
============================== */

const updateMasterData = async (
  Model,
  id,
  payload
) => {
  const {
    name,
    code,
    description,
    isActive,
  } = payload;

  const updateData = {};


  /* ==============================
     Name
  ============================== */

  if (name !== undefined) {
    if (!name.trim()) {
      throw ApiError.badRequest(
        "Name cannot be empty"
      );
    }

    updateData.name = name.trim();
  }


  /* ==============================
     Code
  ============================== */

  if (code !== undefined) {
    updateData.code = code.trim();
  }


  /* ==============================
     Description
  ============================== */

  if (description !== undefined) {
    updateData.description =
      description.trim();
  }


  /* ==============================
     Active Status
  ============================== */

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      throw ApiError.badRequest(
        "isActive must be a boolean"
      );
    }

    updateData.isActive = isActive;
  }


  /* ==============================
     Update
  ============================== */

  const data = await updateById(
    Model,
    id,
    updateData
  );

  if (!data) {
    throw ApiError.notFound("Data not found");
  }

  return data;
};


/* ==============================
   Delete Master Data
============================== */

const deleteMasterData = async (
  Model,
  id
) => {
  const data = await deleteById(
    Model,
    id
  );

  if (!data) {
    throw ApiError.notFound("Data not found");
  }

  return data;
};


export {
  createMasterData,
  getAllMasterData,
  getMasterDataById,
  updateMasterData,
  deleteMasterData,
};