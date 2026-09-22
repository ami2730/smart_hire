"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  ArrowLeft,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { jobsApi, type CreateJobInput } from "@/lib/api/jobs.api";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ShieldCheck } from "lucide-react";

const createJobSchema = z.object({
  title: z.string().min(3, "Job title must be at least 3 characters").max(120),
  department: z.string().optional(),
  location: z.string().optional(),
  description: z.string().min(50, "Description must be at least 50 characters"),
  minimumExperienceYears: z.coerce.number().min(0).max(30).optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
});

type CreateJobFormData = z.infer<typeof createJobSchema>;

function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (vals: string[]) => void;
}) {
  const [inputVal, setInputVal] = React.useState("");

  const addTag = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputVal("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((v) => v !== tag));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          className="shrink-0 h-9 px-3"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [requiredSkills, setRequiredSkills] = React.useState<string[]>([]);
  const [educationReqs, setEducationReqs] = React.useState<string[]>([]);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Block applicants from posting jobs
  if (user?.role === "APPLICANT") {
    return (
      <PageContainer title="Access Restricted">
        <Card>
          <CardContent className="py-20 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-base font-semibold text-foreground">Access Restricted</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Job posting is available to recruiters and administrators only.
            </p>
            <Link href="/jobs" className="inline-block mt-2">
              <Button size="sm">Browse Available Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateJobFormData>({
    resolver: zodResolver(createJobSchema as any),
    defaultValues: {
      status: "DRAFT",
      minimumExperienceYears: 0,
    },
  });

  const currentStatus = watch("status");

  const createMutation = useMutation({
    mutationFn: (input: CreateJobInput) => jobsApi.create(input),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setIsSuccess(true);
      setTimeout(() => router.push("/jobs"), 1500);
    },
    onError: (err: any) => {
      setSubmitError(err?.message ?? "Failed to create job posting. Please try again.");
    },
  });

  const onSubmit = async (data: CreateJobFormData) => {
    setSubmitError(null);
    const input: CreateJobInput = {
      title: data.title,
      department: data.department || undefined,
      location: data.location || undefined,
      description: data.description,
      requiredSkills,
      educationRequirements: educationReqs,
      minimumExperienceYears: data.minimumExperienceYears,
      status: data.status,
    };
    await createMutation.mutateAsync(input);
  };

  if (isSuccess) {
    return (
      <PageContainer title="Create Job Posting">
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Job Posted Successfully</h3>
            <p className="text-xs text-muted-foreground mt-1">Redirecting to job listings…</p>
            <Loader2 className="h-4 w-4 animate-spin text-primary mt-4" />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Create Job Posting"
      subtitle="Define the role requirements. The AI engine will use these to match and screen candidates."
      actions={
        <Link href="/jobs">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
        {submitError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{submitError}</p>
          </div>
        )}

        {/* Basic Info Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Job Information
            </CardTitle>
            <CardDescription className="text-xs">
              Provide the job title, location, and department for this posting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Job Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Senior Backend Engineer"
                {...register("title")}
                className={cn(errors.title && "border-destructive")}
              />
              {errors.title && (
                <p className="text-[11px] font-medium text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g. Engineering"
                  {...register("department")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Addis Ababa (Hybrid)"
                  {...register("location")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minimumExperienceYears">Minimum Experience (Years)</Label>
              <Input
                id="minimumExperienceYears"
                type="number"
                min={0}
                max={30}
                placeholder="0"
                className="w-32"
                {...register("minimumExperienceYears")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Job Description</CardTitle>
            <CardDescription className="text-xs">
              Describe the role, responsibilities, and expectations. Minimum 50 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              {...register("description")}
              placeholder="Describe the role, key responsibilities, team structure, and what success looks like..."
              rows={8}
              className={cn(
                "w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors",
                errors.description ? "border-destructive" : "border-input"
              )}
            />
            {errors.description && (
              <p className="text-[11px] font-medium text-destructive mt-1">
                {errors.description.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Skills & Requirements Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Skills & Requirements</CardTitle>
            <CardDescription className="text-xs">
              Define required skills and education. The AI engine uses these to compute match scores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <TagInput
              label="Required Skills"
              placeholder="Type a skill and press Enter (e.g. Python)"
              values={requiredSkills}
              onChange={setRequiredSkills}
            />
            <TagInput
              label="Education Requirements"
              placeholder="e.g. Bachelor's in Computer Science"
              values={educationReqs}
              onChange={setEducationReqs}
            />
          </CardContent>
        </Card>

        {/* Publishing Options Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Publishing</CardTitle>
            <CardDescription className="text-xs">
              Save as draft to review later, or publish immediately to start accepting applications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue("status", "DRAFT")}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer",
                  currentStatus === "DRAFT"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-accent/40"
                )}
              >
                <p className="text-sm font-semibold text-foreground">Save as Draft</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Not visible to candidates yet
                </p>
              </button>
              <button
                type="button"
                onClick={() => setValue("status", "ACTIVE")}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer",
                  currentStatus === "ACTIVE"
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-950/20"
                    : "border-border bg-card hover:bg-accent/40"
                )}
              >
                <p className="text-sm font-semibold text-foreground">Publish Now</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active and accepting applications
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="gap-2 px-6 font-medium shadow-xs">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {currentStatus === "ACTIVE" ? "Publish Job" : "Save Draft"}
              </>
            )}
          </Button>
          <Link href="/jobs">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
