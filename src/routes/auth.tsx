import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — ZeroGap AI" },
    { name: "description", content: "Sign in or create your free ZeroGap AI account." },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter email and password."); return; }
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Welcome back 👋");
      navigate({ to: "/dashboard" });
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter email and password."); return; }
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name || email.split("@")[0],
        }
      }
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else if (data?.user?.identities?.length === 0) {
      toast.error("An account with this email already exists.");
      setLoading(false);
    } else {
      toast.success("Account created! Check your email for a welcome message and confirmation link 🎉", {
        duration: 8000,
      });
      // Optionally navigate, though they might need to confirm email first depending on Supabase settings
      // navigate({ to: "/dashboard" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-[420px] relative">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="font-display font-extrabold text-2xl tracking-tight text-foreground">
            <span className="text-primary font-serif">✱ </span>ZEROGAP<span className="font-light text-muted-foreground"> AI</span>
          </span>
        </Link>

        <div className="rounded-sm bg-card border border-border/80 p-8 shadow-2xl">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="anything works" />
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-silver text-primary-foreground">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Name</Label>
                  <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="anything works" />
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-silver text-primary-foreground">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground mt-4 hover:text-primary">← Back to home</Link>
      </div>
    </div>
  );
}
