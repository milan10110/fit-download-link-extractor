"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Upload, Download, Loader2, AlertCircle, Check, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// Removed getDisplayFilename as we now use backend filename

export default function Home() {
  const [links, setLinks] = useState("");
  const [successLinks, setSuccessLinks] = useState<{url: string, filename: string}[]>([]);
  const [failedLinks, setFailedLinks] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [bulkCopied, setBulkCopied] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (successLinks.length > 0 || failedLinks.length > 0) {
      // Small delay to ensure render is complete before scrolling
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [successLinks, failedLinks]);

  const handleExtract = async () => {
    if (!links.trim()) {
      setError("Please paste some links first.");
      return;
    }
    
    setError(null);
    setLoading(true);
    setSuccessLinks([]);
    setFailedLinks([]);
    setSelectedLinks(new Set());
    setBulkCopied(false);

    try {
      const linkArray = links.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: linkArray }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to extract links.");
      }

      if (data.data && Array.isArray(data.data)) {
        const successes: {url: string, filename: string}[] = [];
        const failures: string[] = [];
        
        data.data.forEach((res: any) => {
          if (res.error) {
            failures.push(res.error);
          } else if (res.url) {
            successes.push({ url: res.url, filename: res.filename || res.url });
          }
        });
        
        setSuccessLinks(successes);
        setFailedLinks(failures);
        setSelectedLinks(new Set(successes.map(s => s.url)));
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleBulkCopy = () => {
    const toCopy = selectedLinks.size > 0 
      ? Array.from(selectedLinks).join("\n") 
      : successLinks.map(s => s.url).join("\n");
      
    if (!toCopy) return;
    
    navigator.clipboard.writeText(toCopy);
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const toDownload = selectedLinks.size > 0 
      ? Array.from(selectedLinks).join("\n") 
      : successLinks.map(s => s.url).join("\n");
      
    if (!toDownload) return;
    
    const blob = new Blob([toDownload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fitgirl-links.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSelection = (link: string, checked: boolean) => {
    const newSet = new Set(selectedLinks);
    if (checked) {
      newSet.add(link);
    } else {
      newSet.delete(link);
    }
    setSelectedLinks(newSet);
  };

  const handleToggleAll = () => {
    if (selectedLinks.size > 0) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(successLinks.map(s => s.url)));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background p-4 md:p-8 flex justify-center items-start pt-12 pb-24">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent pb-1">
            FitGirl Link Extractor
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Paste FitGirl fast download page links below to automatically extract the direct download URLs. Easy, fast, and clutter-free.
          </p>
        </div>

        <div className="flex flex-col gap-8 relative">
          {/* Input Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Input Links
              </CardTitle>
              <CardDescription>
                Paste the URLs you want to process, one per line.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="input-links" className="sr-only">Input Links</Label>
                <Textarea
                  id="input-links"
                  placeholder={
`https://fuckingfast.co/vkoe5x#NFSMW_--_fitgirl-repacks.site_--_.part1.rar
https://fuckingfast.co/e46tei#NFSMW_--_fitgirl-repacks.site_--_.part2.rar
https://fuckingfast.co/isp94n#NFSMW_--_fitgirl-repacks.site_--_.part3.rar
https://fuckingfast.co/tmc5ro#NFSMW_--_fitgirl-repacks.site_--_.part4.rar
https://fuckingfast.co/w3kjay#NFSMW_--_fitgirl-repacks.site_--_.part5.rar
https://fuckingfast.co/0j6ct9#setup-fitgirl-selective-english.bin
https://fuckingfast.co/8f04o7#setup-fitgirl-selective-french.bin
https://fuckingfast.co/pz5oic#setup-fitgirl-selective-german.bin
https://fuckingfast.co/vyiehk#setup-fitgirl-selective-italian.bin
https://fuckingfast.co/hjstg4#setup-fitgirl-selective-japanese.bin
https://fuckingfast.co/d24lpe#setup-fitgirl-selective-russian.bin
https://fuckingfast.co/cdh3pi#setup-fitgirl-selective-spanish.bin`
                  }
                  className="h-[300px] overflow-y-auto resize-none font-mono text-sm bg-background/50 focus-visible:ring-primary"
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
              {error && (
                <div className="text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <Button 
                onClick={handleExtract} 
                disabled={loading} 
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract Links"
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Output Section */}
          {(successLinks.length > 0 || failedLinks.length > 0) && (
            <Card ref={resultsRef} className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl scroll-mt-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-accent" />
                    Extracted Results
                  </CardTitle>
                  <CardDescription>
                    Review and copy your direct download links.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={successLinks.length > 0 ? "success" : "failed"} className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="success">Successful ({successLinks.length})</TabsTrigger>
                    <TabsTrigger value="failed">Failed ({failedLinks.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="success" className="space-y-4">
                    {successLinks.length > 0 ? (
                      <>
                        {/* Action Toolbar */}
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <Button size="sm" variant="secondary" onClick={handleBulkCopy}>
                            {bulkCopied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                            {selectedLinks.size > 0 ? `Copy Selected (${selectedLinks.size})` : "Copy All"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleDownloadTxt}>
                            <FileDown className="w-4 h-4 mr-2" />
                            Download .txt
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleToggleAll}>
                            {selectedLinks.size > 0 ? "Deselect All" : "Select All"}
                          </Button>
                        </div>

                        {/* Interactive List */}
                        <ScrollArea className="h-[400px] w-full rounded-md border border-border/50 bg-background/50 p-4">
                          <div className="space-y-2">
                            {successLinks.map((linkObj, idx) => (
                              <div 
                                key={idx} 
                                className={`flex items-center gap-3 p-3 rounded-md border hover:border-border/50 transition-colors group cursor-pointer ${
                                  copiedLink === linkObj.url 
                                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                                    : 'border-transparent hover:bg-accent/5'
                                }`}
                                onClick={() => handleCopyLink(linkObj.url)}
                              >
                                <div className="flex items-center h-full" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox 
                                    id={`link-${idx}`} 
                                    checked={selectedLinks.has(linkObj.url)} 
                                    onCheckedChange={(checked) => toggleSelection(linkObj.url, checked as boolean)}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <span className="truncate font-mono text-sm font-medium text-foreground/90 selection:bg-primary/30" title={linkObj.url}>
                                    {linkObj.filename}
                                  </span>
                                  <span className="truncate text-xs text-muted-foreground" title={linkObj.url}>
                                    {new URL(linkObj.url).hostname}
                                  </span>
                                </div>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`h-8 w-8 transition-opacity ${copiedLink === linkObj.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  onClick={(e) => { e.stopPropagation(); handleCopyLink(linkObj.url); }}
                                >
                                  {copiedLink === linkObj.url ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground border rounded-md border-dashed">
                        No successful links extracted.
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="failed">
                    {failedLinks.length > 0 ? (
                      <ScrollArea className="h-[300px] w-full rounded-md border border-destructive/20 bg-destructive/5 p-4">
                        <div className="space-y-2">
                          {failedLinks.map((err, idx) => (
                            <div key={idx} className="p-3 bg-background/50 rounded-md text-sm font-mono text-destructive break-all border border-destructive/10">
                              {err}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground border rounded-md border-dashed">
                        No failed extractions! 🎉
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
