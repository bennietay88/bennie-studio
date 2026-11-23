import React from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ArrowRight, CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { SafeImage } from "./SafeImage";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";

const getPostDate = (post: any) => post?.created_at || post?.createdAt || post?.updated_at || post?.updatedAt;

export default function PublicBlogPostPage() {
  const { slug } = useParams();
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
      <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#15191f]">
        <PublicSiteHeader />
        <main id="main-content" role="status" aria-label="Loading article" className="brand-shell flex min-h-[60vh] items-center justify-center">
          <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin text-[#1741ed]" />
        </main>
        <PublicSiteFooter />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#15191f]">
        <Helmet><title>Article unavailable | Bennie Studio</title><meta name="robots" content="noindex" /></Helmet>
        <PublicSiteHeader />
        <main id="main-content" className="brand-shell flex min-h-[60vh] items-center py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">Bennie Studio · Insights</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">This article is unavailable.</h1>
            <p className="mt-4 text-base leading-7 text-[#526071]">{error || "This article may have been moved or unpublished."}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/resources" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1741ed] px-6 py-3 text-sm font-bold text-white hover:bg-[#1035c2]">Browse resources <ArrowRight className="ml-2 h-4 w-4" /></Link>
              <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#dbe1ea] bg-white px-6 py-3 text-sm font-bold text-[#1741c9] hover:bg-[#eef3ff]">Back to homepage</Link>
            </div>
          </div>
        </main>
        <PublicSiteFooter />
      </div>
    );
  }

  return (
    <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#141821]">
      <Helmet>
        <title>{title} | Bennie Studio</title>
        <meta name="description" content={description} />
      </Helmet>

      <PublicSiteHeader />

      <main id="main-content">
        <section className="border-b border-[#dce2e8] bg-[#f8f8f5] text-[#15191f]">
          <div className="brand-shell py-14 sm:py-20">
            <Link to="/#blog" className="inline-flex items-center text-sm font-semibold !text-[#657181] hover:!text-[#1741ed]"><ArrowLeft className="mr-2 h-4 w-4" />Back to insights</Link>
            
            <h1 className="mt-4 !max-w-[16ch] !text-[#15191f]">{title}</h1>
            {description && <p className="brand-copy !text-[#596573] mt-6">{description}</p>}
            {publishedAt && <p className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] !text-[#697587]"><CalendarDays className="h-4 w-4" />{new Date(publishedAt).toLocaleDateString()}</p>}
          </div>
        </section>

        <article className="brand-shell mx-auto max-w-5xl py-12 sm:py-16">
        {imageUrl && (
          <SafeImage
            src={imageUrl}
            alt={title}
            loading="eager"
            className="h-full w-full object-cover"
            containerClassName="aspect-video overflow-hidden rounded-xl border border-[#dbe1ea] bg-[#edf1f7]"
          />
        )}

        <div className="prose prose-slate mt-10 max-w-3xl prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#1741ed] prose-a:underline">
          <ReactMarkdown>{post.content || description}</ReactMarkdown>
        </div>
      </article>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
