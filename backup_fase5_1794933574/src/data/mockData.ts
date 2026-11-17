import { Conversation, Message, CallRecord, EphemeralStatus, Contact, ThemeConfig } from '../types';

export const CURRENT_USER = {
  id: 'user_me',
  phoneNumber: '+52 55 8923 4410',
  displayName: 'Alex Valenzuela',
  username: 'alexv_nakeic',
  bio: 'Explorando arquitectura móvil nativa & seguridad 🔐',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  isOnline: true,
  lastSeen: 'En línea',
  fingerprint: 'NK-8821-4490-EC55-33B1-9988-2A7F'
};

export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'nakeic_cyan',
    name: 'Cyan Nórdico (Predeterminado)',
    mode: 'dark',
    primaryColor: '#00B4D8',
    secondaryColor: '#0077B6',
    bubbleSent: '#0077B6',
    bubbleReceivedDark: '#1E293B',
    bubbleReceivedLight: '#E2E8F0',
    bgDark: '#0A0F1D',
    bgLight: '#F8FAFC',
    surfaceDark: '#141B2D',
    surfaceLight: '#FFFFFF',
    oledBlack: false,
    fontSize: 'medium'
  },
  {
    id: 'nakeic_amethyst',
    name: 'Amatista Neón',
    mode: 'dark',
    primaryColor: '#8B5CF6',
    secondaryColor: '#6D28D9',
    bubbleSent: '#7C3AED',
    bubbleReceivedDark: '#1F1B2E',
    bubbleReceivedLight: '#EDE9FE',
    bgDark: '#0D0B18',
    bgLight: '#FAF5FF',
    surfaceDark: '#181427',
    surfaceLight: '#FFFFFF',
    oledBlack: false,
    fontSize: 'medium'
  },
  {
    id: 'nakeic_emerald',
    name: 'Esmeralda Cuántico',
    mode: 'dark',
    primaryColor: '#10B981',
    secondaryColor: '#059669',
    bubbleSent: '#047857',
    bubbleReceivedDark: '#132A24',
    bubbleReceivedLight: '#E6F4EA',
    bgDark: '#071612',
    bgLight: '#F0FDF4',
    surfaceDark: '#0E241E',
    surfaceLight: '#FFFFFF',
    oledBlack: false,
    fontSize: 'medium'
  },
  {
    id: 'nakeic_ruby',
    name: 'Rubí Fuego',
    mode: 'dark',
    primaryColor: '#F43F5E',
    secondaryColor: '#E11D48',
    bubbleSent: '#BE123C',
    bubbleReceivedDark: '#2C151B',
    bubbleReceivedLight: '#FFE4E6',
    bgDark: '#14080B',
    bgLight: '#FFF1F2',
    surfaceDark: '#200D13',
    surfaceLight: '#FFFFFF',
    oledBlack: false,
    fontSize: 'medium'
  },
  {
    id: 'nakeic_amber',
    name: 'Ámbar Cálido',
    mode: 'dark',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    bubbleSent: '#B45309',
    bubbleReceivedDark: '#291F14',
    bubbleReceivedLight: '#FEF3C7',
    bgDark: '#130E07',
    bgLight: '#FFFBEB',
    surfaceDark: '#22190E',
    surfaceLight: '#FFFFFF',
    oledBlack: false,
    fontSize: 'medium'
  },
  {
    id: 'nakeic_oled_midnight',
    name: 'Medianoche OLED Puro',
    mode: 'dark',
    primaryColor: '#38BDF8',
    secondaryColor: '#0284C7',
    bubbleSent: '#1E293B',
    bubbleReceivedDark: '#121212',
    bubbleReceivedLight: '#F1F5F9',
    bgDark: '#000000',
    bgLight: '#FFFFFF',
    surfaceDark: '#0A0A0A',
    surfaceLight: '#F8FAFC',
    oledBlack: true,
    fontSize: 'medium'
  }
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c_valeria',
    name: 'Valeria Méndez',
    phoneNumber: '+52 55 4912 3091',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    bio: 'Arquitecta Android | Kotlin Multiplatform 🚀',
    isRegistered: true
  },
  {
    id: 'c_diego',
    name: 'Diego Rivas',
    phoneNumber: '+34 612 884 901',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: 'Ingeniería de Audio & WebRTC en tiempo real',
    isRegistered: true
  },
  {
    id: 'c_sofia',
    name: 'Dra. Sofía Campos',
    phoneNumber: '+54 9 11 3829 4410',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    bio: 'Seguridad Informática & Criptografía Post-Cuántica',
    isRegistered: true
  },
  {
    id: 'c_carlos',
    name: 'Carlos Mendoza',
    phoneNumber: '+57 310 994 2280',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    bio: 'Diseñador UI/UX enfocado en Material You',
    isRegistered: true
  },
  {
    id: 'c_lucia',
    name: 'Lucía Morales',
    phoneNumber: '+52 81 2290 1488',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    bio: '¡Hola! Te invito a probar NAKEIC',
    isRegistered: false
  },
  {
    id: 'c_fernando',
    name: 'Fernando Torres',
    phoneNumber: '+56 9 8493 2190',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    bio: 'Disponible pronto en NAKEIC',
    isRegistered: false
  }
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  conv_valeria: [
    {
      id: 'm1',
      conversationId: 'conv_valeria',
      senderId: 'c_valeria',
      senderName: 'Valeria Méndez',
      text: '¡Hola Alex! Ya revisé la arquitectura modular de NAKEIC con Compose y Clean Architecture.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 2,
      reactions: { '👍': ['user_me'], '🔥': ['c_valeria'] }
    },
    {
      id: 'm2',
      conversationId: 'conv_valeria',
      senderId: 'user_me',
      senderName: 'Alex Valenzuela',
      text: 'Excelente Valeria. Asegúrate de que el motor de temas soporte colores primarios y burbujas personalizadas al 100%.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 1.8
    },
    {
      id: 'm3',
      conversationId: 'conv_valeria',
      senderId: 'c_valeria',
      senderName: 'Valeria Méndez',
      text: 'Te dejé una nota de voz explicando el manejo de canales de audio y las formas de onda en vivo:',
      type: 'voice',
      status: 'read',
      timestamp: Date.now() - 3600000 * 1.5,
      mediaUrl: 'sample_voice.mp3',
      durationSeconds: 18,
      waveform: [15, 30, 60, 95, 40, 80, 100, 75, 55, 30, 85, 90, 65, 40, 20, 50, 70, 45, 25, 10],
      reactions: { '❤️': ['user_me'] }
    },
    {
      id: 'm4',
      conversationId: 'conv_valeria',
      senderId: 'c_valeria',
      senderName: 'Valeria Méndez',
      text: 'Aquí está la captura de la prueba de rendimiento de Room con 10,000 mensajes indexados:',
      type: 'image',
      status: 'read',
      timestamp: Date.now() - 3600000 * 1.1,
      mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      replyTo: {
        id: 'm2',
        senderName: 'Alex Valenzuela',
        text: 'Asegúrate de que el motor de temas soporte colores primarios...',
        type: 'text'
      }
    },
    {
      id: 'm5',
      conversationId: 'conv_valeria',
      senderId: 'user_me',
      senderName: 'Alex Valenzuela',
      text: 'Quedó increíble. Cifrado E2EE Double Ratchet verificado sin latencia perceptible.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 15,
      isPinned: true
    },
    {
      id: 'm_viewonce',
      conversationId: 'conv_valeria',
      senderId: 'c_valeria',
      senderName: 'Valeria Méndez',
      text: 'Foto confidencial',
      type: 'image',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 10,
      mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
      isViewOnce: true,
      isViewedOnce: false
    },
    {
      id: 'm_loc',
      conversationId: 'conv_valeria',
      senderId: 'c_valeria',
      senderName: 'Valeria Méndez',
      text: 'Ubicación en tiempo real compartida',
      type: 'location',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 5,
      location: {
        lat: 19.4326,
        lng: -99.1332,
        label: 'Sede NAKEIC Central',
        address: 'Paseo de la Reforma 222, CDMX'
      }
    }
  ],
  conv_equipo: [
    {
      id: 'mg1',
      conversationId: 'conv_equipo',
      senderId: 'c_diego',
      senderName: 'Diego Rivas',
      text: 'Compañeros, las pruebas de WebRTC P2P en Android 15 con códec Opus y VP9 están dando menos de 65ms de jitter.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 4
    },
    {
      id: 'mg_poll',
      conversationId: 'conv_equipo',
      senderId: 'user_me',
      senderName: 'Alex Valenzuela',
      text: '¿A qué hora hacemos la videollamada grupal hoy?',
      type: 'poll',
      status: 'read',
      timestamp: Date.now() - 3600000 * 3,
      poll: {
        question: '¿A qué hora hacemos la videollamada grupal hoy?',
        options: [
          { id: 'opt_1', text: '10:00 AM (Mañana)', votes: ['c_diego', 'c_sofia'] },
          { id: 'opt_2', text: '03:30 PM (Tarde)', votes: ['user_me', 'c_carlos'] },
          { id: 'opt_3', text: '07:00 PM (Noche)', votes: [] }
        ],
        allowsMultipleAnswers: false
      }
    },
    {
      id: 'mg2',
      conversationId: 'conv_equipo',
      senderId: 'c_sofia',
      senderName: 'Dra. Sofía Campos',
      text: 'Perfecto. Acabo de subir la documentación con los lineamientos criptográficos en PDF.',
      type: 'file',
      fileName: 'NAKEIC_Security_Specs_v1.0.pdf',
      fileSize: '3.4 MB',
      status: 'read',
      timestamp: Date.now() - 3600000 * 2.5
    },
    {
      id: 'mg3',
      conversationId: 'conv_equipo',
      senderId: 'c_carlos',
      senderName: 'Carlos Mendoza',
      text: 'Adjunto las paletas oficiales NAKEIC (Cyan, Amatista, Esmeralda, Rubí y OLED Puro). ¡Cero parecido a WhatsApp!',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 20,
      reactions: { '🚀': ['user_me', 'c_diego'] }
    }
  ],
  conv_diego: [
    {
      id: 'md1',
      conversationId: 'conv_diego',
      senderId: 'c_diego',
      senderName: 'Diego Rivas',
      text: '¿Hacemos una llamada de prueba por NAKEIC para verificar cancelación de eco?',
      type: 'text',
      status: 'delivered',
      timestamp: Date.now() - 1000 * 60 * 45
    }
  ],
  conv_sofia: [
    {
      id: 'ms1',
      conversationId: 'conv_sofia',
      senderId: 'c_sofia',
      senderName: 'Dra. Sofía Campos',
      text: 'Las claves maestras en Android Keystore con hardware StrongBox están operando impecables.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 8
    }
  ],
  conv_saved_messages: [
    {
      id: 'sm1',
      conversationId: 'conv_saved_messages',
      senderId: 'user_me',
      senderName: 'Tú (Mensajes Guardados)',
      text: '📌 Nota personal: Presentación de arquitectura NAKEIC vs WhatsApp/Telegram a las 4:00 PM.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 5,
      isPinned: true
    },
    {
      id: 'sm2',
      conversationId: 'conv_saved_messages',
      senderId: 'user_me',
      senderName: 'Tú (Mensajes Guardados)',
      text: 'Enlace del repositorio y documentación de cifrado: https://github.com/nakeic/android-native-app',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 2
    }
  ],
  conv_business_store: [
    {
      id: 'bs1',
      conversationId: 'conv_business_store',
      senderId: 'business_store',
      senderName: 'NAKEIC Store Oficial',
      text: '¡Hola Alex! Bienvenido a la tienda oficial de NAKEIC. Aquí puedes explorar terminales de seguridad, accesorios y servicios exclusivos con soporte 24/7.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 6
    },
    {
      id: 'bs2',
      conversationId: 'conv_business_store',
      senderId: 'business_store',
      senderName: 'NAKEIC Store Oficial',
      text: '🌟 Producto Destacado del Catálogo:',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 3,
      productCard: {
        id: 'prod_1',
        title: 'NAKEIC Titan Security Phone',
        price: '$799 USD',
        description: 'Smartphone con chip de seguridad dedicado, OS sin rastreo y cifrado en hardware.',
        imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80'
      }
    }
  ],
  conv_telegram_channel: [
    {
      id: 'tc1',
      conversationId: 'conv_telegram_channel',
      senderId: 'channel_bot',
      senderName: 'NAKEIC Oficial 📢',
      text: '🚀 Actualización NAKEIC v2.6.0 ya disponible:\n\n• Nuevas Carpetas de Chats estilo Telegram\n• Hub Empresarial & Catálogo WhatsApp Business\n• Mensajes Guardados en Nube Personal\n• Respuestas Rápidas con atajo /\n• Envío Silencioso y Programado',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000 * 1,
      viewsCount: 14820
    }
  ]
};

export const BUSINESS_LABELS: Record<string, { id: string; name: string; color: string; bgHex: string }> = {
  new_customer: { id: 'new_customer', name: 'Nuevo cliente', color: '#10B981', bgHex: 'rgba(16, 185, 129, 0.2)' },
  pending_payment: { id: 'pending_payment', name: 'Pago pendiente', color: '#F59E0B', bgHex: 'rgba(245, 158, 11, 0.2)' },
  paid: { id: 'paid', name: 'Pagado', color: '#06B6D4', bgHex: 'rgba(6, 182, 212, 0.2)' },
  completed: { id: 'completed', name: 'Finalizado', color: '#8B5CF6', bgHex: 'rgba(139, 92, 246, 0.2)' },
  vip: { id: 'vip', name: 'Cliente VIP ⭐', color: '#EC4899', bgHex: 'rgba(236, 72, 153, 0.2)' },
  lead: { id: 'lead', name: 'Prospecto', color: '#3B82F6', bgHex: 'rgba(59, 130, 246, 0.2)' }
};

export const QUICK_REPLIES = [
  { shortcut: '/gracias', title: 'Agradecimiento', text: '¡Muchas gracias por comunicarte con nosotros! ¿En qué más podemos ayudarte hoy? 😊' },
  { shortcut: '/horario', title: 'Horario comercial', text: '🕒 Nuestro horario de atención comercial es de Lunes a Sábado de 9:00 AM a 8:00 PM.' },
  { shortcut: '/catalogo', title: 'Catálogo de productos', text: '🛍️ Puedes consultar nuestro catálogo oficial actualizado en la pestaña de tienda o aquí en el chat.' },
  { shortcut: '/pago', title: 'Métodos de pago', text: '💳 Aceptamos transferencias bancarias directas, tarjetas Visa/Mastercard y pagos protegidos.' },
  { shortcut: '/soporte', title: 'Soporte técnico', text: '🛠️ Un asesor técnico te atenderá de inmediato. Tu número de ticket es #NK-2026.' }
];

export const OFFICIAL_CATALOG = [
  {
    id: 'prod_1',
    title: 'NAKEIC Titan Security Phone',
    price: '$799 USD',
    category: 'Dispositivos',
    description: 'Smartphone con chip de seguridad dedicado, OS sin rastreo y cifrado cuántico.',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80',
    inStock: true
  },
  {
    id: 'prod_2',
    title: 'Llave Criptográfica FIDO2 NFC',
    price: '$65 USD',
    category: 'Seguridad',
    description: 'Llave física USB-C y NFC para autenticación sin contraseña y firmas biométricas.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
    inStock: true
  },
  {
    id: 'prod_3',
    title: 'Auriculares NAKEIC Sound ANC Pro',
    price: '$180 USD',
    category: 'Audio',
    description: 'Cancelación activa de ruido híbrida, audio espacial y llamadas claras con IA.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
    inStock: true
  },
  {
    id: 'prod_4',
    title: 'Suscripción NAKEIC Business Cloud',
    price: '$19 / mes',
    category: 'Software',
    description: 'Almacenamiento ilimitado en nube privada E2EE, bots comerciales y CRM integrado.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=80',
    inStock: true
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_saved_messages',
    title: 'Mensajes Guardados (Nube)',
    isGroup: false,
    avatarUrl: 'https://images.unsplash.com/photo-1534972195531-a756b1126f25?w=200&auto=format&fit=crop&q=80',
    unreadCount: 0,
    isPinned: true,
    isMuted: false,
    disappearingSeconds: null,
    memberIds: ['user_me'],
    isSavedMessages: true,
    description: 'Tu almacenamiento personal ilimitado en la nube de Telegram / NAKEIC',
    lastMessage: INITIAL_MESSAGES.conv_saved_messages[INITIAL_MESSAGES.conv_saved_messages.length - 1]
  },
  {
    id: 'conv_business_store',
    title: 'NAKEIC Store Oficial',
    isGroup: false,
    avatarUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&auto=format&fit=crop&q=80',
    unreadCount: 1,
    isPinned: true,
    isMuted: false,
    disappearingSeconds: null,
    isBusiness: true,
    isVerifiedBusiness: true,
    businessCategory: 'Tecnología & Dispositivos',
    label: 'vip',
    businessProfile: {
      name: 'NAKEIC Store Oficial',
      category: 'Tecnología & Dispositivos Móviles',
      description: 'Tienda oficial verificada con terminales de alta seguridad, hardware y soluciones comerciales.',
      hours: 'Lun - Sáb: 9:00 AM - 8:00 PM',
      email: 'ventas@nakeic.com',
      website: 'https://nakeic.com',
      address: 'Paseo de la Reforma 222, Piso 18, CDMX',
      isVerified: true,
      catalog: OFFICIAL_CATALOG
    },
    memberIds: ['user_me', 'business_store'],
    lastMessage: INITIAL_MESSAGES.conv_business_store[INITIAL_MESSAGES.conv_business_store.length - 1]
  },
  {
    id: 'conv_telegram_channel',
    title: 'NAKEIC Comunidad Global 📢',
    isGroup: false,
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    unreadCount: 3,
    isPinned: false,
    isMuted: false,
    disappearingSeconds: null,
    isChannel: true,
    channelSubscribers: '148,200',
    viewsCount: 14820,
    description: 'Canal de difusión oficial con noticias, novedades y lanzamientos globales.',
    memberIds: ['user_me', 'channel_bot'],
    lastMessage: INITIAL_MESSAGES.conv_telegram_channel[INITIAL_MESSAGES.conv_telegram_channel.length - 1]
  },
  {
    id: 'conv_valeria',
    title: 'Valeria Méndez',
    isGroup: false,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    disappearingSeconds: null,
    label: 'vip',
    memberIds: ['user_me', 'c_valeria'],
    lastMessage: INITIAL_MESSAGES.conv_valeria[INITIAL_MESSAGES.conv_valeria.length - 1]
  },
  {
    id: 'conv_equipo',
    title: 'NAKEIC Core Devs 🚀',
    isGroup: true,
    avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
    unreadCount: 2,
    isPinned: false,
    isMuted: false,
    disappearingSeconds: 604800, // 7 días
    memberIds: ['user_me', 'c_valeria', 'c_diego', 'c_sofia', 'c_carlos'],
    adminIds: ['user_me'],
    description: 'Grupo oficial de arquitectura e ingeniería del cliente Android NAKEIC.',
    lastMessage: INITIAL_MESSAGES.conv_equipo[INITIAL_MESSAGES.conv_equipo.length - 1]
  },
  {
    id: 'conv_diego',
    title: 'Diego Rivas',
    isGroup: false,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    unreadCount: 1,
    isPinned: false,
    isMuted: false,
    disappearingSeconds: null,
    label: 'new_customer',
    memberIds: ['user_me', 'c_diego'],
    lastMessage: INITIAL_MESSAGES.conv_diego[INITIAL_MESSAGES.conv_diego.length - 1]
  },
  {
    id: 'conv_sofia',
    title: 'Dra. Sofía Campos',
    isGroup: false,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    unreadCount: 0,
    isPinned: false,
    isMuted: true,
    disappearingSeconds: 86400, // 24h
    label: 'pending_payment',
    memberIds: ['user_me', 'c_sofia'],
    lastMessage: INITIAL_MESSAGES.conv_sofia[INITIAL_MESSAGES.conv_sofia.length - 1]
  }
];

export const INITIAL_CALLS: CallRecord[] = [
  {
    id: 'call_1',
    contactId: 'c_valeria',
    contactName: 'Valeria Méndez',
    contactAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    isVideo: true,
    direction: 'incoming',
    timestamp: Date.now() - 1000 * 60 * 35,
    durationSeconds: 420
  },
  {
    id: 'call_2',
    contactId: 'c_diego',
    contactName: 'Diego Rivas',
    contactAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    isVideo: false,
    direction: 'missed',
    timestamp: Date.now() - 3600000 * 3,
    durationSeconds: 0
  },
  {
    id: 'call_3',
    contactId: 'c_sofia',
    contactName: 'Dra. Sofía Campos',
    contactAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    isVideo: false,
    direction: 'outgoing',
    timestamp: Date.now() - 3600000 * 24,
    durationSeconds: 185
  }
];

export const INITIAL_STATUSES: EphemeralStatus[] = [
  {
    id: 'st_1',
    userId: 'c_valeria',
    userName: 'Valeria Méndez',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    textCaption: 'Terminando el módulo de llamadas WebRTC con baja latencia ⚡️',
    timestamp: Date.now() - 3600000 * 1.5,
    expiresAt: Date.now() + 3600000 * 22.5,
    isViewed: false
  },
  {
    id: 'st_2',
    userId: 'c_diego',
    userName: 'Diego Rivas',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bgHex: '#0077B6',
    textCaption: '«La privacidad en mensajería no es un lujo, es un derecho fundamental.» — NAKEIC Protocol',
    timestamp: Date.now() - 3600000 * 4,
    expiresAt: Date.now() + 3600000 * 20,
    isViewed: true
  },
  {
    id: 'st_3',
    userId: 'c_carlos',
    userName: 'Carlos Mendoza',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
    textCaption: 'Probando el motor de personalización de temas dinámicos en vivo 🎨',
    timestamp: Date.now() - 3600000 * 6,
    expiresAt: Date.now() + 3600000 * 18,
    isViewed: false
  }
];

export const INITIAL_CHANNELS = [
  {
    id: 'ch_nakeic',
    name: 'NAKEIC Oficial',
    avatarUrl: '/nakeic_logo.jpg',
    description: 'Novedades, actualizaciones de seguridad y lanzamientos oficiales de NAKEIC.',
    followersCount: '1.2 M seguidores',
    isVerified: true,
    isFollowing: true,
    lastUpdate: {
      text: '🚀 ¡Lanzamiento oficial de NAKEIC v2.5! Nuevas videollamadas grupales WebRTC, modo 1 sola vez y encuestas interactivas.',
      timestamp: Date.now() - 3600000 * 3
    }
  },
  {
    id: 'ch_tech',
    name: 'Tecnología & Ciberseguridad',
    avatarUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
    description: 'Canal de noticias sobre privacidad, cifrado cuántico y desarrollo móvil en Android.',
    followersCount: '450 K seguidores',
    isVerified: true,
    isFollowing: false,
    lastUpdate: {
      text: '🔒 Nuevos estándares de criptografía poscuántica recomendados por NIST para mensajería instantánea.',
      timestamp: Date.now() - 3600000 * 8
    }
  },
  {
    id: 'ch_sports',
    name: 'Fútbol & Deportes en Vivo',
    avatarUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
    description: 'Resultados, alineaciones y noticias deportivas al instante.',
    followersCount: '890 K seguidores',
    isVerified: true,
    isFollowing: false,
    lastUpdate: {
      text: '⚽ Resumen de la jornada de Champions League y goles destacados.',
      timestamp: Date.now() - 3600000 * 12
    }
  }
];
