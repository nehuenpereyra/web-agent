

--
-- PostgreSQL database dump
--
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE public.web_index (
    id integer NOT NULL,
    vector_id text NOT NULL,
    embedding public.vector(768),
    metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.web_index OWNER TO postgres;
CREATE SEQUENCE public.web_index_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.web_index_id_seq OWNER TO postgres;
ALTER SEQUENCE public.web_index_id_seq OWNED BY public.web_index.id;
ALTER TABLE ONLY public.web_index ALTER COLUMN id SET DEFAULT nextval('public.web_index_id_seq'::regclass);
ALTER TABLE ONLY public.web_index
    ADD CONSTRAINT web_index_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.web_index
    ADD CONSTRAINT web_index_vector_id_key UNIQUE (vector_id);
CREATE INDEX web_index_vector_idx ON public.web_index USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');

--
-- PostgreSQL database dump complete
--

-- CreateTable
CREATE TABLE "chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chunks_document_id_idx" ON "chunks"("document_id");
