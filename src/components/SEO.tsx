import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string; // path or absolute
  jsonLd?: object;
}

export default function SEO({ title, description, canonical, jsonLd }: SEOProps) {
  useEffect(() => {
    // Title
    if (title) document.title = title.length > 60 ? `${title.slice(0, 57)}...` : title;

    // Description
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description.slice(0, 155));
    }

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      const href = canonical.startsWith('http') ? canonical : `${window.location.origin}${canonical}`;
      link.setAttribute('href', href);
    }

    // JSON-LD structured data
    let jsonScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonScript = document.createElement('script');
      jsonScript.type = 'application/ld+json';
      jsonScript.text = JSON.stringify(jsonLd);
      document.head.appendChild(jsonScript);
    }

    return () => {
      if (jsonScript) {
        document.head.removeChild(jsonScript);
      }
    };
  }, [title, description, canonical, JSON.stringify(jsonLd)]);

  return null;
}
