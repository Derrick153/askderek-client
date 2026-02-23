"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CustomFormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ApplicationFormData, applicationSchema } from "@/lib/schemas";
import { useCreateApplicationMutation } from "@/state/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { CheckCircle, Send } from "lucide-react";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
}

const ApplicationModal = ({ isOpen, onClose, propertyId }: ApplicationModalProps) => {
  const { user } = useUser();
  const [createApplication, { isLoading }] = useCreateApplicationMutation();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      message: "",
    },
  });

  // Pre-fill form with Clerk user data when modal opens
  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.primaryEmailAddress?.emailAddress || "",
        phoneNumber: user.primaryPhoneNumber?.phoneNumber || "",
        message: "",
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = async (data: ApplicationFormData) => {
    if (!user?.id) {
      toast.error("You must be logged in to apply");
      return;
    }

    try {
      await createApplication({
        ...data,
        applicationDate: new Date().toISOString(),
        status: "Pending",
        propertyId,
        tenantClerkId: user.id,
      }).unwrap();

      toast.success("Application submitted! The landlord will review it shortly.");
      onClose();
      form.reset();
    } catch (error: any) {
      const message = error?.data?.message || "Failed to submit application";
      if (message.includes("already have an active application")) {
        toast.info("You already applied to this property. Check My Applications for the status.");
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <DialogTitle className="text-xl font-black text-gray-900">
              Apply for this Property
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-500 text-sm">
            Fill in your details and the landlord will review your application.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <CustomFormField name="name" label="Full Name" type="text" placeholder="Your full name" />
            <CustomFormField name="email" label="Email Address" type="email" placeholder="your@email.com" />
            <CustomFormField name="phoneNumber" label="Phone Number (Ghana)" type="text" placeholder="024 XXX XXXX" />
            <CustomFormField name="message" label="Message to Landlord (Optional)" type="textarea" placeholder="Tell the landlord about yourself, move-in date, etc." />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;