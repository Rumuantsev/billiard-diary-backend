const pool = require("../db");

const groupTrainingColumns =
  "id, coach_id, group_id, starts_at, ends_at, status, created_at, updated_at, deleted_at";
const athleteTrainingColumns =
  "id, group_training_id, coach_id, athlete_id, starts_at, ends_at, status, created_at, updated_at, deleted_at";
const trainingItemColumns =
  "id, athlete_training_id, exercise_id, order_index, target_attempts, result_attempts, result_successes, status, created_at, updated_at, deleted_at";
const athleteJsonSelect = `jsonb_build_object(
  'id', users.id,
  'email', users.email,
  'name', users.name,
  'role', users.role,
  'coach_id', users.coach_id,
  'created_at', users.created_at,
  'updated_at', users.updated_at,
  'deleted_at', users.deleted_at
) AS athlete`;

const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const insertTrainingItems = async (client, athleteTrainingIds, items) => {
  if (athleteTrainingIds.length === 0 || items.length === 0) {
    return;
  }

  const values = [];
  const placeholders = [];

  athleteTrainingIds.forEach((athleteTrainingId) => {
    items.forEach((item) => {
      values.push(
        athleteTrainingId,
        item.exerciseId,
        item.orderIndex,
        item.targetAttempts ?? null,
      );
      placeholders.push(
        `($${values.length - 3}, $${values.length - 2}, $${values.length - 1}, $${values.length})`,
      );
    });
  });

  await client.query(
    `INSERT INTO training_item(
       athlete_training_id,
       exercise_id,
       order_index,
       target_attempts
     )
     VALUES ${placeholders.join(", ")}`,
    values,
  );
};

const insertTrainingItemsForAthletes = async (
  client,
  athleteTrainingRows,
  itemsByAthleteId,
) => {
  for (const row of athleteTrainingRows) {
    const items = itemsByAthleteId.get(Number(row.athleteId)) ?? [];
    await insertTrainingItems(client, [row.id], items);
  }
};

const buildSetClauses = (fields) => {
  const values = [];
  const setClauses = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([column, value]) => {
      values.push(value);
      return `${column} = $${values.length}`;
    });

  return { setClauses, values };
};

const applyTrainingFilters = (where, values, filters, tableAlias) => {
  if (filters.status) {
    values.push(filters.status);
    where.push(`${tableAlias}.status = $${values.length}`);
  }

  if (filters.date) {
    values.push(filters.date);
    where.push(
      `${tableAlias}.starts_at >= $${values.length}::date AND ${tableAlias}.starts_at < ($${values.length}::date + interval '1 day')`,
    );
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`${tableAlias}.starts_at >= $${values.length}`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    where.push(`${tableAlias}.starts_at <= $${values.length}`);
  }
};

const createIndividualTraining = async ({
  coachId,
  athleteId,
  startsAt,
  endsAt,
  items,
}) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO athlete_training(coach_id, athlete_id, starts_at, ends_at)
       VALUES($1, $2, $3, $4)
       RETURNING ${athleteTrainingColumns}`,
      [coachId, athleteId, startsAt, endsAt],
    );

    const athleteTraining = result.rows[0];
    await insertTrainingItems(client, [athleteTraining.id], items);

    return athleteTraining;
  });

const createGroupTraining = async ({
  coachId,
  groupId,
  athleteIds,
  startsAt,
  endsAt,
  items,
  itemsByAthleteId,
}) =>
  withTransaction(async (client) => {
    const groupResult = await client.query(
      `INSERT INTO group_training(coach_id, group_id, starts_at, ends_at)
       VALUES($1, $2, $3, $4)
       RETURNING ${groupTrainingColumns}`,
      [coachId, groupId, startsAt, endsAt],
    );

    const groupTraining = groupResult.rows[0];
    const athleteTrainingIds = [];
    const athleteTrainingRows = [];

    for (const athleteId of athleteIds) {
      const athleteResult = await client.query(
        `INSERT INTO athlete_training(
           group_training_id,
           coach_id,
           athlete_id,
           starts_at,
           ends_at
         )
         VALUES($1, $2, $3, $4, $5)
         RETURNING ${athleteTrainingColumns}`,
        [groupTraining.id, coachId, athleteId, startsAt, endsAt],
      );

      const athleteTraining = athleteResult.rows[0];
      athleteTrainingIds.push(athleteTraining.id);
      athleteTrainingRows.push({
        id: athleteTraining.id,
        athleteId: Number(athleteTraining.athlete_id),
      });
    }

    if (itemsByAthleteId) {
      await insertTrainingItemsForAthletes(
        client,
        athleteTrainingRows,
        itemsByAthleteId,
      );
    } else {
      await insertTrainingItems(client, athleteTrainingIds, items);
    }

    return groupTraining;
  });

const findGroupTrainingsByCoach = async (coachId, filters = {}) => {
  const values = [coachId];
  const where = [
    "group_training.coach_id = $1",
    "group_training.deleted_at IS NULL",
  ];

  applyTrainingFilters(where, values, filters, "group_training");

  if (filters.groupId) {
    values.push(filters.groupId);
    where.push(`group_training.group_id = $${values.length}`);
  }

  if (filters.athleteId) {
    values.push(filters.athleteId);
    where.push(
      `EXISTS (
        SELECT 1
        FROM athlete_training scoped_athlete_training
        WHERE scoped_athlete_training.group_training_id = group_training.id
          AND scoped_athlete_training.athlete_id = $${values.length}
          AND scoped_athlete_training.deleted_at IS NULL
      )`,
    );
  }

  const result = await pool.query(
    `SELECT group_training.id,
            group_training.coach_id,
            group_training.group_id,
            group_training.starts_at,
            group_training.ends_at,
            group_training.status,
            group_training.created_at,
            group_training.updated_at,
            group_training.deleted_at,
            COUNT(athlete_training.id)::int AS athlete_trainings_count
     FROM group_training
     LEFT JOIN athlete_training ON athlete_training.group_training_id = group_training.id
       AND athlete_training.deleted_at IS NULL
     WHERE ${where.join(" AND ")}
     GROUP BY
       group_training.id,
       group_training.coach_id,
       group_training.group_id,
       group_training.starts_at,
       group_training.ends_at,
       group_training.status,
       group_training.created_at,
       group_training.updated_at,
       group_training.deleted_at
     ORDER BY group_training.starts_at DESC, group_training.id DESC`,
    values,
  );

  return result.rows;
};

const findIndividualAthleteTrainingsByCoach = async (coachId, filters = {}) => {
  if (filters.groupId) {
    return [];
  }

  const values = [coachId];
  const where = [
    "athlete_training.coach_id = $1",
    "athlete_training.group_training_id IS NULL",
    "athlete_training.deleted_at IS NULL",
  ];

  applyTrainingFilters(where, values, filters, "athlete_training");

  if (filters.athleteId) {
    values.push(filters.athleteId);
    where.push(`athlete_training.athlete_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT athlete_training.id,
            athlete_training.group_training_id,
            athlete_training.coach_id,
            athlete_training.athlete_id,
            athlete_training.starts_at,
            athlete_training.ends_at,
            athlete_training.status,
            athlete_training.created_at,
            athlete_training.updated_at,
            athlete_training.deleted_at,
            ${athleteJsonSelect},
            COUNT(training_item.id)::int AS items_count
     FROM athlete_training
     JOIN users ON users.id = athlete_training.athlete_id
     LEFT JOIN training_item ON training_item.athlete_training_id = athlete_training.id
       AND training_item.deleted_at IS NULL
     WHERE ${where.join(" AND ")}
     GROUP BY
       athlete_training.id,
       athlete_training.group_training_id,
       athlete_training.coach_id,
       athlete_training.athlete_id,
       athlete_training.starts_at,
       athlete_training.ends_at,
       athlete_training.status,
       athlete_training.created_at,
       athlete_training.updated_at,
       athlete_training.deleted_at,
       users.id,
       users.email,
       users.name,
       users.role,
       users.coach_id,
       users.created_at,
       users.updated_at,
       users.deleted_at
     ORDER BY athlete_training.starts_at DESC, athlete_training.id DESC`,
    values,
  );

  return result.rows;
};

const findAthleteTrainingsByAthlete = async (athleteId, filters = {}) => {
  const values = [athleteId];
  const where = [
    "athlete_training.athlete_id = $1",
    "athlete_training.deleted_at IS NULL",
  ];

  applyTrainingFilters(where, values, filters, "athlete_training");

  if (filters.groupId) {
    values.push(filters.groupId);
    where.push(
      `EXISTS (
        SELECT 1
        FROM group_training
        WHERE group_training.id = athlete_training.group_training_id
          AND group_training.group_id = $${values.length}
          AND group_training.deleted_at IS NULL
      )`,
    );
  }

  const result = await pool.query(
    `SELECT athlete_training.id,
            athlete_training.group_training_id,
            athlete_training.coach_id,
            athlete_training.athlete_id,
            athlete_training.starts_at,
            athlete_training.ends_at,
            athlete_training.status,
            athlete_training.created_at,
            athlete_training.updated_at,
            athlete_training.deleted_at,
            ${athleteJsonSelect},
            COUNT(training_item.id)::int AS items_count
     FROM athlete_training
     JOIN users ON users.id = athlete_training.athlete_id
     LEFT JOIN training_item ON training_item.athlete_training_id = athlete_training.id
       AND training_item.deleted_at IS NULL
     WHERE ${where.join(" AND ")}
     GROUP BY
       athlete_training.id,
       athlete_training.group_training_id,
       athlete_training.coach_id,
       athlete_training.athlete_id,
       athlete_training.starts_at,
       athlete_training.ends_at,
       athlete_training.status,
       athlete_training.created_at,
       athlete_training.updated_at,
       athlete_training.deleted_at,
       users.id,
       users.email,
       users.name,
       users.role,
       users.coach_id,
       users.created_at,
       users.updated_at,
       users.deleted_at
     ORDER BY athlete_training.starts_at DESC, athlete_training.id DESC`,
    values,
  );

  return result.rows;
};

const findTrainingsByCoach = async (coachId, filters = {}) => {
  const values = [coachId];
  const groupWhere = [
    "group_training.coach_id = $1",
    "group_training.deleted_at IS NULL",
  ];
  const athleteWhere = [
    "athlete_training.coach_id = $1",
    "athlete_training.group_training_id IS NULL",
    "athlete_training.deleted_at IS NULL",
  ];

  applyTrainingFilters(groupWhere, values, filters, "group_training");
  applyTrainingFilters(athleteWhere, values, filters, "athlete_training");

  if (filters.groupId) {
    values.push(filters.groupId);
    groupWhere.push(`group_training.group_id = $${values.length}`);
    athleteWhere.push("FALSE");
  }

  if (filters.athleteId) {
    values.push(filters.athleteId);
    groupWhere.push(
      `EXISTS (
        SELECT 1
        FROM athlete_training scoped_athlete_training
        WHERE scoped_athlete_training.group_training_id = group_training.id
          AND scoped_athlete_training.athlete_id = $${values.length}
          AND scoped_athlete_training.deleted_at IS NULL
      )`,
    );
    athleteWhere.push(`athlete_training.athlete_id = $${values.length}`);
  }

  values.push(filters.limit);
  const limitParam = `$${values.length}`;
  values.push(filters.offset);
  const offsetParam = `$${values.length}`;

  const result = await pool.query(
    `WITH scoped_trainings AS (
       SELECT 'group' AS type,
              group_training.id,
              NULL::bigint AS group_training_id,
              group_training.coach_id,
              group_training.group_id,
              NULL::bigint AS athlete_id,
              group_training.starts_at,
              group_training.ends_at,
              group_training.status,
              group_training.created_at,
              group_training.updated_at,
              group_training.deleted_at,
              COUNT(athlete_training.id)::int AS athlete_trainings_count,
              NULL::int AS items_count,
              NULL::jsonb AS athlete
       FROM group_training
       LEFT JOIN athlete_training ON athlete_training.group_training_id = group_training.id
         AND athlete_training.deleted_at IS NULL
       WHERE ${groupWhere.join(" AND ")}
       GROUP BY
         group_training.id,
         group_training.coach_id,
         group_training.group_id,
         group_training.starts_at,
         group_training.ends_at,
         group_training.status,
         group_training.created_at,
         group_training.updated_at,
         group_training.deleted_at

       UNION ALL

       SELECT 'athlete' AS type,
              athlete_training.id,
              athlete_training.group_training_id,
              athlete_training.coach_id,
              NULL::bigint AS group_id,
              athlete_training.athlete_id,
              athlete_training.starts_at,
              athlete_training.ends_at,
              athlete_training.status,
              athlete_training.created_at,
              athlete_training.updated_at,
              athlete_training.deleted_at,
              NULL::int AS athlete_trainings_count,
              COUNT(training_item.id)::int AS items_count,
              ${athleteJsonSelect}
       FROM athlete_training
       JOIN users ON users.id = athlete_training.athlete_id
       LEFT JOIN training_item ON training_item.athlete_training_id = athlete_training.id
         AND training_item.deleted_at IS NULL
       WHERE ${athleteWhere.join(" AND ")}
       GROUP BY
         athlete_training.id,
         athlete_training.group_training_id,
         athlete_training.coach_id,
         athlete_training.athlete_id,
         athlete_training.starts_at,
         athlete_training.ends_at,
         athlete_training.status,
         athlete_training.created_at,
         athlete_training.updated_at,
         athlete_training.deleted_at,
         users.id,
         users.email,
         users.name,
         users.role,
         users.coach_id,
         users.created_at,
         users.updated_at,
         users.deleted_at
     ),
     total_count AS (
       SELECT COUNT(*)::int AS total FROM scoped_trainings
     ),
     page AS (
       SELECT *
       FROM scoped_trainings
       ORDER BY starts_at DESC, id DESC
       LIMIT ${limitParam}
       OFFSET ${offsetParam}
     )
     SELECT page.*, total_count.total
     FROM total_count
     LEFT JOIN page ON TRUE`,
    values,
  );

  return {
    trainings: result.rows.filter((row) => row.id !== null),
    total: result.rows[0]?.total ?? 0,
  };
};

const findTrainingsByAthlete = async (athleteId, filters = {}) => {
  const values = [athleteId];
  const where = [
    "athlete_training.athlete_id = $1",
    "athlete_training.deleted_at IS NULL",
  ];

  applyTrainingFilters(where, values, filters, "athlete_training");

  if (filters.groupId) {
    values.push(filters.groupId);
    where.push(
      `EXISTS (
        SELECT 1
        FROM group_training
        WHERE group_training.id = athlete_training.group_training_id
          AND group_training.group_id = $${values.length}
          AND group_training.deleted_at IS NULL
      )`,
    );
  }

  values.push(filters.limit);
  const limitParam = `$${values.length}`;
  values.push(filters.offset);
  const offsetParam = `$${values.length}`;

  const result = await pool.query(
    `WITH scoped_trainings AS (
       SELECT 'athlete' AS type,
              athlete_training.id,
              athlete_training.group_training_id,
              athlete_training.coach_id,
              athlete_training.athlete_id,
              athlete_training.starts_at,
              athlete_training.ends_at,
              athlete_training.status,
              athlete_training.created_at,
              athlete_training.updated_at,
              athlete_training.deleted_at,
              ${athleteJsonSelect},
              COUNT(training_item.id)::int AS items_count
       FROM athlete_training
       JOIN users ON users.id = athlete_training.athlete_id
       LEFT JOIN training_item ON training_item.athlete_training_id = athlete_training.id
         AND training_item.deleted_at IS NULL
       WHERE ${where.join(" AND ")}
       GROUP BY
         athlete_training.id,
         athlete_training.group_training_id,
         athlete_training.coach_id,
         athlete_training.athlete_id,
         athlete_training.starts_at,
         athlete_training.ends_at,
         athlete_training.status,
         athlete_training.created_at,
         athlete_training.updated_at,
         athlete_training.deleted_at,
         users.id,
         users.email,
         users.name,
         users.role,
         users.coach_id,
         users.created_at,
         users.updated_at,
         users.deleted_at
     ),
     total_count AS (
       SELECT COUNT(*)::int AS total FROM scoped_trainings
     ),
     page AS (
       SELECT *
       FROM scoped_trainings
       ORDER BY starts_at DESC, id DESC
       LIMIT ${limitParam}
       OFFSET ${offsetParam}
     )
     SELECT page.*, total_count.total
     FROM total_count
     LEFT JOIN page ON TRUE`,
    values,
  );

  return {
    trainings: result.rows.filter((row) => row.id !== null),
    total: result.rows[0]?.total ?? 0,
  };
};

const findGroupTrainingById = async (id, { coachId } = {}) => {
  const values = [id];
  const where = ["id = $1", "deleted_at IS NULL"];

  if (coachId) {
    values.push(coachId);
    where.push(`coach_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT ${groupTrainingColumns}
     FROM group_training
     WHERE ${where.join(" AND ")}`,
    values,
  );

  return result.rows[0] ?? null;
};

const findAthleteTrainingById = async (id, { coachId, athleteId } = {}) => {
  const values = [id];
  const where = ["athlete_training.id = $1", "athlete_training.deleted_at IS NULL"];

  if (coachId) {
    values.push(coachId);
    where.push(`athlete_training.coach_id = $${values.length}`);
  }

  if (athleteId) {
    values.push(athleteId);
    where.push(`athlete_training.athlete_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT athlete_training.id,
            athlete_training.group_training_id,
            athlete_training.coach_id,
            athlete_training.athlete_id,
            athlete_training.starts_at,
            athlete_training.ends_at,
            athlete_training.status,
            athlete_training.created_at,
            athlete_training.updated_at,
            athlete_training.deleted_at,
            ${athleteJsonSelect}
     FROM athlete_training
     JOIN users ON users.id = athlete_training.athlete_id
     WHERE ${where.join(" AND ")}`,
    values,
  );

  return result.rows[0] ?? null;
};

const findAthleteTrainingsByGroupTrainingId = async (groupTrainingId) => {
  const result = await pool.query(
    `SELECT athlete_training.id,
            athlete_training.group_training_id,
            athlete_training.coach_id,
            athlete_training.athlete_id,
            athlete_training.starts_at,
            athlete_training.ends_at,
            athlete_training.status,
            athlete_training.created_at,
            athlete_training.updated_at,
            athlete_training.deleted_at,
            ${athleteJsonSelect}
     FROM athlete_training
     JOIN users ON users.id = athlete_training.athlete_id
     WHERE athlete_training.group_training_id = $1
       AND athlete_training.deleted_at IS NULL
     ORDER BY athlete_training.athlete_id ASC, athlete_training.id ASC`,
    [groupTrainingId],
  );

  return result.rows;
};

const findItemsByAthleteTrainingIds = async (athleteTrainingIds) => {
  if (athleteTrainingIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT training_item.id,
            training_item.athlete_training_id,
            training_item.exercise_id,
            training_item.order_index,
            training_item.target_attempts,
            training_item.result_attempts,
            training_item.result_successes,
            training_item.status,
            training_item.created_at,
            training_item.updated_at,
            training_item.deleted_at,
            to_jsonb(exercise) AS exercise
     FROM training_item
     JOIN exercise ON exercise.id = training_item.exercise_id
     WHERE training_item.athlete_training_id = ANY($1::bigint[])
       AND training_item.deleted_at IS NULL
     ORDER BY training_item.order_index ASC, training_item.id ASC`,
    [athleteTrainingIds],
  );

  return result.rows;
};

const updateGroupTraining = async (id, data, { coachId }) =>
  withTransaction(async (client) => {
    const { setClauses, values } = buildSetClauses({
      starts_at: data.startsAt,
      ends_at: data.endsAt,
    });

    values.push(id);
    const idParam = `$${values.length}`;
    values.push(coachId);
    const coachParam = `$${values.length}`;

    const result = await client.query(
      `UPDATE group_training
       SET ${setClauses.join(", ")}, updated_at = now()
       WHERE id = ${idParam}
         AND coach_id = ${coachParam}
         AND deleted_at IS NULL
       RETURNING ${groupTrainingColumns}`,
      values,
    );

    const groupTraining = result.rows[0] ?? null;

    if (groupTraining && (data.startsAt !== undefined || data.endsAt !== undefined)) {
      const childFields = {};
      if (data.startsAt !== undefined) {
        childFields.starts_at = data.startsAt;
      }
      if (data.endsAt !== undefined) {
        childFields.ends_at = data.endsAt;
      }

      const childUpdate = buildSetClauses(childFields);
      childUpdate.values.push(id);

      await client.query(
        `UPDATE athlete_training
         SET ${childUpdate.setClauses.join(", ")}, updated_at = now()
         WHERE group_training_id = $${childUpdate.values.length}
           AND deleted_at IS NULL`,
        childUpdate.values,
      );
    }

    return groupTraining;
  });

const softDeleteGroupTraining = async (id, { coachId }) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE group_training
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND coach_id = $2 AND deleted_at IS NULL
       RETURNING ${groupTrainingColumns}`,
      [id, coachId],
    );

    const groupTraining = result.rows[0] ?? null;
    if (!groupTraining) {
      return null;
    }

    await client.query(
      `UPDATE athlete_training
       SET deleted_at = now(), updated_at = now()
       WHERE group_training_id = $1 AND deleted_at IS NULL`,
      [id],
    );

    await client.query(
      `UPDATE training_item
       SET deleted_at = now(), updated_at = now()
       WHERE athlete_training_id IN (
         SELECT athlete_training.id
         FROM athlete_training
         WHERE athlete_training.group_training_id = $1
       )
       AND deleted_at IS NULL`,
      [id],
    );

    return groupTraining;
  });

const updateGroupTrainingStatus = async (id, status, { coachId }) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE group_training
       SET status = $1, updated_at = now()
       WHERE id = $2 AND coach_id = $3 AND deleted_at IS NULL
       RETURNING ${groupTrainingColumns}`,
      [status, id, coachId],
    );

    const groupTraining = result.rows[0] ?? null;
    if (!groupTraining) {
      return null;
    }

    await client.query(
      `UPDATE athlete_training
       SET status = $1, updated_at = now()
       WHERE group_training_id = $2 AND deleted_at IS NULL`,
      [status, id],
    );

    return groupTraining;
  });

const updateAthleteTraining = async (id, data, { coachId }) => {
  const { setClauses, values } = buildSetClauses({
    athlete_id: data.athleteId,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
  });

  values.push(id);
  const idParam = `$${values.length}`;
  values.push(coachId);
  const coachParam = `$${values.length}`;

  const result = await pool.query(
    `UPDATE athlete_training
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = ${idParam}
       AND coach_id = ${coachParam}
       AND deleted_at IS NULL
     RETURNING ${athleteTrainingColumns}`,
    values,
  );

  return result.rows[0] ?? null;
};

const softDeleteAthleteTraining = async (id, { coachId }) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE athlete_training
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND coach_id = $2 AND deleted_at IS NULL
       RETURNING ${athleteTrainingColumns}`,
      [id, coachId],
    );

    const athleteTraining = result.rows[0] ?? null;
    if (!athleteTraining) {
      return null;
    }

    await client.query(
      `UPDATE training_item
       SET deleted_at = now(), updated_at = now()
       WHERE athlete_training_id = $1 AND deleted_at IS NULL`,
      [id],
    );

    return athleteTraining;
  });

const updateAthleteTrainingStatus = async (id, status, { coachId, athleteId } = {}) => {
  const values = [status, id];
  const where = ["id = $2", "deleted_at IS NULL"];

  if (coachId) {
    values.push(coachId);
    where.push(`coach_id = $${values.length}`);
  }

  if (athleteId) {
    values.push(athleteId);
    where.push(`athlete_id = $${values.length}`);
  }

  const result = await pool.query(
    `UPDATE athlete_training
     SET status = $1, updated_at = now()
     WHERE ${where.join(" AND ")}
     RETURNING ${athleteTrainingColumns}`,
    values,
  );

  return result.rows[0] ?? null;
};

const createTrainingItem = async ({ athleteTrainingId, exerciseId, orderIndex, targetAttempts }) => {
  const result = await pool.query(
    `INSERT INTO training_item(
       athlete_training_id,
       exercise_id,
       order_index,
       target_attempts
     )
     VALUES($1, $2, $3, $4)
     RETURNING ${trainingItemColumns}`,
    [athleteTrainingId, exerciseId, orderIndex, targetAttempts ?? null],
  );

  return result.rows[0];
};

const findTrainingItemById = async (athleteTrainingId, itemId) => {
  const result = await pool.query(
    `SELECT ${trainingItemColumns}
     FROM training_item
     WHERE id = $1
       AND athlete_training_id = $2
       AND deleted_at IS NULL`,
    [itemId, athleteTrainingId],
  );

  return result.rows[0] ?? null;
};

const updateTrainingItem = async (athleteTrainingId, itemId, data) => {
  const { setClauses, values } = buildSetClauses({
    order_index: data.orderIndex,
    target_attempts: data.targetAttempts,
  });

  values.push(itemId);
  const itemParam = `$${values.length}`;
  values.push(athleteTrainingId);
  const trainingParam = `$${values.length}`;

  const result = await pool.query(
    `UPDATE training_item
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = ${itemParam}
       AND athlete_training_id = ${trainingParam}
       AND deleted_at IS NULL
     RETURNING ${trainingItemColumns}`,
    values,
  );

  return result.rows[0] ?? null;
};

const softDeleteTrainingItem = async (athleteTrainingId, itemId) => {
  const result = await pool.query(
    `UPDATE training_item
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1
       AND athlete_training_id = $2
       AND deleted_at IS NULL
     RETURNING ${trainingItemColumns}`,
    [itemId, athleteTrainingId],
  );

  return result.rows[0] ?? null;
};

const updateTrainingItemStatus = async (athleteTrainingId, itemId, status) => {
  const result = await pool.query(
    `UPDATE training_item
     SET status = $1, updated_at = now()
     WHERE id = $2
       AND athlete_training_id = $3
       AND deleted_at IS NULL
     RETURNING ${trainingItemColumns}`,
    [status, itemId, athleteTrainingId],
  );

  return result.rows[0] ?? null;
};

const updateTrainingItemResult = async (
  athleteTrainingId,
  itemId,
  { resultAttempts, resultSuccesses },
) => {
  const result = await pool.query(
    `UPDATE training_item
     SET result_attempts = $1,
         result_successes = $2,
         updated_at = now()
     WHERE id = $3
       AND athlete_training_id = $4
       AND deleted_at IS NULL
     RETURNING ${trainingItemColumns}`,
    [resultAttempts, resultSuccesses, itemId, athleteTrainingId],
  );

  return result.rows[0] ?? null;
};

module.exports = {
  createIndividualTraining,
  createGroupTraining,
  findGroupTrainingsByCoach,
  findIndividualAthleteTrainingsByCoach,
  findAthleteTrainingsByAthlete,
  findTrainingsByAthlete,
  findTrainingsByCoach,
  findGroupTrainingById,
  findAthleteTrainingById,
  findAthleteTrainingsByGroupTrainingId,
  findItemsByAthleteTrainingIds,
  updateGroupTraining,
  softDeleteGroupTraining,
  updateGroupTrainingStatus,
  updateAthleteTraining,
  softDeleteAthleteTraining,
  updateAthleteTrainingStatus,
  createTrainingItem,
  findTrainingItemById,
  updateTrainingItem,
  softDeleteTrainingItem,
  updateTrainingItemStatus,
  updateTrainingItemResult,
};
