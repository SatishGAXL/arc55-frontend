import { FormInstance } from "antd";
import { Button, Spin, Form } from "antd";
import React, { useEffect, useState } from "react";

interface SubmitButtonProps {
  form: FormInstance;
  onClick: (form: FormInstance) => Promise<void>;
}

export const SubmitButton: React.FC<
  React.PropsWithChildren<SubmitButtonProps>
> = ({ form, onClick, children }) => {
  const [submittable, setSubmittable] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Watch all values
  const values = Form.useWatch([], form);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  const onClickInternal = async () => {
    setIsSubmitting(true);
    await onClick(form);
    setIsSubmitting(false);
  };

  return (
    <Button
      type="primary"
      htmlType="submit"
      onClick={onClickInternal}
      disabled={!submittable || isSubmitting}
    >
      <Spin size="small" spinning={isSubmitting}>
        {children}
      </Spin>
    </Button>
  );
};
