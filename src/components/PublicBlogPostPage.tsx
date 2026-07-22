import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CalendarDays, Home, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "../lib/supabase";
import { SafeImage } from "./SafeImage";

const getPostDate = (post: any) => post?.created_at || post?.createdAt || post?.updated_at || post?.updatedAt;

export default function PublicBlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const controller = new AbortController();

    const fetchPost = async () => {
      if (!slug) {
        setError("Article not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data, error: postError } = await supabase
          .from("posts")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .eq("is_platform_post", true)
          .abortSignal(controller.signal)
          .maybeSingle();

        if (postError) {
          if (postError.code === "42703" || /is_platform_post/i.test(postError.message || "")) {
            const fallback = await supabase
              .from("posts")
              .select("*")
              .eq("slug", slug)
              .eq("status", "published")
              .abortSignal(controller.signal)
              .maybeSingle();

            if (fallback.error) throw fallback.error;
            setPost(fallback.data);
            return;
          }

          throw postError;
        }

        setPost(data);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error loading public blog post:", err);
          setError("Article could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchPost();
    return () => controller.abort();
  }, [slug]);

  const publishedAt = getPostDate(post);
  const title = post?.title || "Article";
  const description = post?.excerpt || "Bennie Studio article.";
  const imageUrl = post?.image_url || post?.imageUrl;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-slate-950">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-6 bg-slate-100 text-slate-700">Article</Badge>
          <h1 className="text-4xl font-black tracking-tight">Article not found</h1>
          <p className="mt-4 text-slate-600">{error || "This article is no longer available."}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Link
              to="/"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
                <Home className="mr-2 h-4 w-4" />
                Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Helmet>
        <title>{title} | Bennie Studio</title>
        <meta name="description" content={description} />
      </Helmet>

      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-indigo-600">
            <Home className="h-5 w-5" />
            Bennie Studio
          </Link>
          <Link
            to="/generate-preview"
            className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            Generate Preview
          </Link>
        </nav>
      </header>

      <article className="mx-auto max-w-5xl px-5 py-12">
        <Button onClick={() => navigate("/#blog")} variant="ghost" className="mb-8 rounded-xl px-0 font-bold text-slate-600">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to articles
        </Button>

        <div className="max-w-3xl">
          <Badge className="mb-5 bg-indigo-50 text-indigo-700">Article</Badge>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
            {title}
          </h1>
          {description && <p className="mt-6 text-lg font-semibold leading-8 text-slate-600">{description}</p>}
          {publishedAt && (
            <p className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
              <CalendarDays className="h-4 w-4" />
              {new Date(publishedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {imageUrl && (
          <SafeImage
            src={imageUrl}
            alt={title}
            loading="eager"
            className="h-full w-full object-cover"
            containerClassName="mt-10 aspect-video overflow-hidden rounded-3xl border border-slate-100 bg-slate-50"
          />
        )}

        <div className="prose prose-slate mt-12 max-w-3xl prose-headings:font-black prose-a:text-indigo-600">
          <ReactMarkdown>{post.content || description}</ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
