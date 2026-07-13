import emailjs from '@emailjs/browser';

// To use this, you need to create an account at https://www.emailjs.com/
// Then get these keys from your account dashboard.
// These should ideally be in .env files, but for the MVP we will keep them here
// until you provide them.

export const sendNotificationEmail = async (
  adminEmail: string,
  clientName: string,
  postTitle: string,
  actionType: 'comment' | 'revision'
) => {
  // Replace these with your actual EmailJS IDs once you create the account
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS klíče nejsou nastaveny. E-mail nebyl odeslán.');
    return;
  }

  try {
    const actionText = actionType === 'comment' 
      ? 'přidal nový komentář' 
      : 'vyžádal úpravu (K revizi)';

    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: adminEmail,
        client_name: clientName,
        post_title: postTitle,
        action_text: actionText,
        link: window.location.origin
      },
      PUBLIC_KEY
    );
    console.log('E-mailová notifikace úspěšně odeslána!');
  } catch (error) {
    console.error('Chyba při odesílání e-mailu:', error);
  }
};
