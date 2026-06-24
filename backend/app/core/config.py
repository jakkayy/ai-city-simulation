from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://aicity:aicity_dev@localhost:5432/aicity_db"

    GROQ_API_KEY_1: str = ""
    GROQ_API_KEY_2: str = ""
    GROQ_API_KEY_3: str = ""

    ENV: str = "development"
    LOG_LEVEL: str = "debug"

    @property
    def groq_api_keys(self) -> list[str]:
        return [k for k in [self.GROQ_API_KEY_1, self.GROQ_API_KEY_2, self.GROQ_API_KEY_3] if k]


settings = Settings()
