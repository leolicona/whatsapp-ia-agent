# Customer Registration Flow Implementation Plan

## Overview
This document outlines the implementation of customer registration within the webhook processing flow for the WAM (WhatsApp Agent Manager) service.

## Architecture Components

### 1. Database Schema
The customer registration system uses the following tables:

- **users**: Stores user information (id, phoneNumber, name)
- **businesses**: Stores business information with WhatsApp integration (wamNumberId)
- **customers**: Links users to businesses (userId, businessId)
- **chats**: Manages chat sessions between customers and businesses
- **messages**: Stores conversation history

### 2. Service Layer

#### Business Service (`business.service.ts`)
- `findBusinessByWamNumberId()`: Finds business by WhatsApp phone number ID
- `getBusinessIdByWamNumberId()`: Returns business ID for registration

#### Customer Service (`customer.service.ts`)
- `findCustomerByPhone()`: Checks if customer exists
- `registerNewCustomer()`: Creates new user, customer, and chat records
- `getExistingCustomer()`: Retrieves existing customer and active chat
- `getMessageHistory()`: Fetches conversation history

#### Registration Service (`registration.service.ts`)
- `processCustomerRegistration()`: Main orchestration function

#### Message Service (`message.service.ts`)
- `saveMessage()`: Persists messages to database

## Webhook Processing Flow

### 1. Webhook Reception
```
Webhook Handler → Webhook Processor (Durable Object)
```

### 2. Customer Registration Process

#### Step 1: Extract Customer Information
```typescript
const phoneNumber = cleanPhoneNumber(contact.wa_id);
const customerName = contact.profile?.name;
```

#### Step 2: Identify Business
```typescript
const businessId = await getBusinessIdByWamNumberId(db, env.WHATSAPP_PHONE_NUMBER_ID);
```

#### Step 3: Process Registration
```typescript
const registrationResult = await processCustomerRegistration(
  db,
  phoneNumber,
  businessId,
  customerName
);
```

#### Step 4: Handle New vs Existing Customers

**New Customer Flow:**
1. Create user record with phone number
2. Link customer to business in customers table
3. Initiate new chat session in chats table
4. Return empty message history

**Existing Customer Flow:**
1. Retrieve user and customer records
2. Get or create active chat session
3. Fetch message history for context

### 3. Message Processing

#### Step 1: Save Incoming Message
```typescript
await saveMessage(db, {
  chatId: registrationResult.chat.id,
  role: 'user',
  content: { text: message.text.body, messageId: message.id },
  whatsappMessageId: message.id
});
```

#### Step 2: AI Processing
- Use message history for context
- Process with function calling capabilities
- Generate appropriate response

#### Step 3: Save Bot Response
```typescript
await saveMessage(db, {
  chatId: registrationResult.chat.id,
  role: 'bot',
  content: { 
    text: responseText,
    functionsExecuted: result.functionsExecuted,
    isParallelExecution: result.isParallelExecution
  }
});
```

## Data Flow Diagram

```
WhatsApp → Webhook → Processor → Business Lookup → Customer Registration
                                                           ↓
Message History ← Chat Session ← Customer Link ← User Creation
                                                           ↓
AI Processing → Response Generation → Message Saving → WhatsApp Response
```

## Key Features

### 1. Automatic Customer Registration
- Seamless onboarding for new customers
- No manual intervention required
- Preserves customer context across sessions

### 2. Message History Persistence
- All conversations stored in database
- Context maintained for AI processing
- Audit trail for customer interactions

### 3. Business Isolation
- Each business operates independently
- Customer data segregated by business
- Multi-tenant architecture support

### 4. Chat Session Management
- Automatic chat session creation
- Support for multiple concurrent chats
- Session lifecycle management

## Error Handling

### Business Not Found
```typescript
if (!businessId) {
  console.error(`❌ No business found for WhatsApp number ID: ${env.WHATSAPP_PHONE_NUMBER_ID}`);
  throw new Error('Business not found for this WhatsApp number');
}
```

### Database Transaction Safety
- All registration operations are atomic
- Rollback on failure
- Consistent state maintenance

## Logging and Monitoring

### Registration Events
- New customer registration: `🆕 Customer registered`
- Existing customer found: `👤 Customer found`
- Chat session info: `💬 Active chat`
- Message history: `📚 Found X previous messages`

### Performance Metrics
- Registration processing time
- Message history retrieval time
- Database operation latency

## Security Considerations

### Data Privacy
- Phone numbers are cleaned and normalized
- Customer data isolated by business
- No cross-business data leakage

### Access Control
- Business-level data segregation
- WhatsApp number ID validation
- Secure database connections

## Future Enhancements

### 1. Customer Profile Management
- Extended customer information
- Preference storage
- Custom fields support

### 2. Advanced Chat Features
- Chat categorization
- Priority handling
- Agent assignment

### 3. Analytics Integration
- Customer journey tracking
- Conversation analytics
- Business intelligence

## Implementation Status

✅ **Completed:**
- Database schema design
- Service layer implementation
- Webhook processor integration
- Message persistence
- Error handling

🔄 **In Progress:**
- Testing and validation
- Performance optimization

📋 **Planned:**
- Advanced analytics
- Customer profile enhancements
- Multi-language support