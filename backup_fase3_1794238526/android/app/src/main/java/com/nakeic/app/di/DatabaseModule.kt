package com.nakeic.app.di

import android.content.Context
import androidx.room.Room
import com.nakeic.app.data.local.ConversationDao
import com.nakeic.app.data.local.MessageDao
import com.nakeic.app.data.local.NakeicDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideNakeicDatabase(
        @ApplicationContext context: Context
    ): NakeicDatabase {
        return Room.databaseBuilder(
            context,
            NakeicDatabase::class.java,
            "nakeic_encrypted.db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideConversationDao(database: NakeicDatabase): ConversationDao {
        return database.conversationDao()
    }

    @Provides
    fun provideMessageDao(database: NakeicDatabase): MessageDao {
        return database.messageDao()
    }
}
