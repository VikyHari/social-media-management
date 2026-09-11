-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "primary_niche" TEXT NOT NULL,
    "secondary_niches" TEXT[],
    "interests" TEXT[],
    "skills" TEXT[],
    "target_audience" TEXT NOT NULL,
    "platforms" TEXT[],
    "content_formats" TEXT[],
    "language" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "equipment" TEXT[],
    "budget" TEXT NOT NULL,
    "time_available" TEXT NOT NULL,
    "experience_level" TEXT NOT NULL,
    "existing_content" TEXT,
    "competitors" TEXT[],
    "monetization_goals" TEXT NOT NULL,
    "brand_positioning" TEXT NOT NULL,
    "content_pillars" JSONB,
    "raw_notes" TEXT,
    "source_conversation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "creator_profile_id" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "target_value" TEXT,
    "target_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_source_conversation_id_key" ON "creator_profiles"("source_conversation_id");

-- CreateIndex
CREATE INDEX "goals_user_id_status_idx" ON "goals"("user_id", "status");

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_source_conversation_id_fkey" FOREIGN KEY ("source_conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
