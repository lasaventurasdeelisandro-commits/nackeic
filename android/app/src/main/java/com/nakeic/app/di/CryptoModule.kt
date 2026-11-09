package com.nakeic.app.di

import com.nakeic.app.core.crypto.SignalProtocolEngine
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object CryptoModule {

    @Provides
    @Singleton
    fun provideSignalProtocolEngine(): SignalProtocolEngine {
        return SignalProtocolEngine()
    }
}
