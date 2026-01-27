"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CustomFormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  ApplicationFormData,
  applicationSchema,
} from "@/lib/schemas";
import {
  useCreateApplicationMutation,
} from "@/state/api";
import { useUser } from "@clerk/nextjs";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
}

const ApplicationModal = ({
  isOpen,
  onClose,
  propertyId,
}: ApplicationModalProps) => {
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

  const onSubmit = async (data: ApplicationFormData) => {
    if (!user?.id) {
      console.error("You must be logged in to submit an application");
      return;
    }
    
    try {
      await createApplication({
        ...data,
        applicationDate: new Date().toISOString(),
        status: "PENDING",
        propertyId,
        tenantClerkId: user.id,
      }).unwrap();
      onClose();
      form.reset();
    } catch (error) {
      console.error("Failed to submit application:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white">
        <DialogHeader className="mb-4">
          <DialogTitle>Submit Application for this Property</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <CustomFormField
              name="name"
              label="Name"
              type="text"
              placeholder="Enter your full name"
            />
            <CustomFormField
              name="email"
              label="Email"
              type="email"
              placeholder="Enter your email address"
            />
            <CustomFormField
              name="phoneNumber"
              label="Phone Number"
              type="text"
              placeholder="Enter your phone number"
            />
            <CustomFormField
              name="message"
              label="Message (Optional)"
              type="textarea"
              placeholder="Enter any additional information"
            />
            <Button type="submit" disabled={isLoading} className="bg-primary-700 text-white w-full">
              {isLoading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;