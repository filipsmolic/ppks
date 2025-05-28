import asyncpg

DATABASE_URL = "postgresql://postgres:Filefaca1964!@localhost/CrowdCast"
pool = None


async def init_db():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL)


def get_pool() -> asyncpg.pool.Pool:
    if pool is None:
        raise RuntimeError("Database pool is not initialized")
    return pool
