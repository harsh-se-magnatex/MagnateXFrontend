'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { sendNotification } from '@/features/admin/api';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Notification = {
  category: string;
  title: string;
  message: string;
};

export default function SendNotificationPage() {
  const [sending, setSending] = useState(false);
  const [data, setData] = useState<Notification>({
    category: '',
    title: '',
    message: '',
  });

  const handleSubmit = async (type: 'notification' | 'release') => {
    try {
      setSending(true);
      await sendNotification(
        data.category,
        data.title,
        data.message,
        type,
      );
      setData({
        category: '',
        message: '',
        title: '',
      });
    } catch (error: any) {
      alert(error.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-[50%] mx-auto">
      <Tabs defaultValue="notification">
        <TabsList className="w-full">
          <TabsTrigger value={'notification'} className="cursor-pointer">
            Send Alerts
          </TabsTrigger>
          <TabsTrigger value={'release'} className="cursor-pointer">
            Send Releases
          </TabsTrigger>
        </TabsList>
        <TabsContent value={'notification'}>
          <FieldSet className="">
            <FieldLegend className="mx-auto">Send Notification</FieldLegend>
            <FieldDescription className="mx-auto">
              Send Notification to all users
            </FieldDescription>
            <FieldGroup>
              <Field>
                <Select
                  value={data.category}
                  onValueChange={(category) =>
                    setData((prev) => ({ ...prev, category }))
                  }
                >
                  <FieldLabel>Select a category</FieldLabel>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                  </SelectContent>
                </Select>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input
                  id="title"
                  autoComplete="off"
                  placeholder="Title"
                  value={data.title}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="message">Message</FieldLabel>
                <Textarea
                  id="message"
                  autoComplete="off"
                  placeholder="Message"
                  value={data.message}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, message: e.target.value }))
                  }
                />
              </Field>
            </FieldGroup>
            <Button
              onClick={()=>handleSubmit('notification')}
              disabled={!data.category || !data.title || !data.message}
            >
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </FieldSet>
        </TabsContent>
        <TabsContent value={'release'}>
          <FieldSet className="">
            <FieldLegend className="mx-auto">
              Send Relase Notification
            </FieldLegend>
            <FieldDescription className="mx-auto">
              Send Release Notification to all users
            </FieldDescription>
            <FieldGroup>
              <Field>
                <Select
                  value={data.category}
                  onValueChange={(category) =>
                    setData((prev) => ({ ...prev, category }))
                  }
                >
                  <FieldLabel>Select a category</FieldLabel>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input
                  id="title"
                  autoComplete="off"
                  placeholder="Title"
                  value={data.title}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="message">Message</FieldLabel>
                <Textarea
                  id="message"
                  autoComplete="off"
                  placeholder="Message"
                  value={data.message}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, message: e.target.value }))
                  }
                />
              </Field>
            </FieldGroup>
            <Button
              onClick={()=>handleSubmit('release')}
              disabled={!data.category || !data.title || !data.message}
            >
              {sending ? 'Sending...' : 'Send Release Notification'}
            </Button>
          </FieldSet>
        </TabsContent>
      </Tabs>
    </div>
  );
}
