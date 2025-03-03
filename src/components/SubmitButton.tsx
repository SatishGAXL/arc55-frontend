import { FormInstance } from "antd";
import { Button, Spin, Form } from "antd";
import React, { useEffect, useState } from "react";

/**
 * Interface for the SubmitButton component props.
 */
interface SubmitButtonProps {
  /**
   * The Ant Design form instance.
   */
  form: FormInstance;
  /**
   * The function to be called when the button is clicked. It should handle form submission.
   * @param {FormInstance} form - The Ant Design form instance.
   * @returns {Promise<void>}
   */
  onClick: (form: FormInstance) => Promise<void>;
}

/**
 * A custom submit button component that handles form validation and submission state.
 *
 * @param {Object} props - The component props.
 * @param {FormInstance} props.form - The Ant Design form instance.
 * @param {function} props.onClick - The function to be called when the button is clicked.
 * @param {React.ReactNode} props.children - The content to be rendered inside the button.
 * @returns {JSX.Element} - A Button component from Ant Design.
 */
export const SubmitButton: React.FC<
  React.PropsWithChildren<SubmitButtonProps>
> = ({ form, onClick, children }) => {
  // State to track if the form is submittable (valid)
  const [submittable, setSubmittable] = useState<boolean>(false);
  // State to track if the form is currently being submitted
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Watch all form values for changes
  const values = Form.useWatch([], form);

  // useEffect hook to validate the form on changes
  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  /**
   * Internal function to handle the button click.
   * It sets the submitting state, calls the onClick function, and resets the submitting state.
   */
  const onClickInternal = async () => {
    setIsSubmitting(true);
    await onClick(form);
    setIsSubmitting(false);
  };

  // Render the button
  return (
    <Button
      type="primary"
      htmlType="submit"
      onClick={onClickInternal}
      disabled={!submittable || isSubmitting}
    >
      {/* Display a spinner while submitting */}
      <Spin size="small" spinning={isSubmitting}>
        {children}
      </Spin>
    </Button>
  );
};
